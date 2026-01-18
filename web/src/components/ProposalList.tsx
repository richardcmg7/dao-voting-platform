'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ethers } from 'ethers';
import { signMetaTxRequest, buildRequest } from '@/lib/metaTx';

interface Proposal {
  id: bigint;
  recipient: string;
  amount: bigint;
  deadline: bigint;
  description: string;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  executed: boolean;
  createdAt: bigint;
}

export default function ProposalList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { account, daoContract, forwarderContract, signer, isConnected } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotes, setUserVotes] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchProposals = async () => {
    if (!daoContract) return;

    try {
      const count = await daoContract.proposalCount();
      const proposalList: Proposal[] = [];
      const newUserVotes = new Map<number, number>();

      for (let i = 1; i <= Number(count); i++) {
        const proposal = await daoContract.getProposal(i);
        proposalList.push(proposal);

        if (account) {
          const [voted, voteType] = await daoContract.getUserVote(i, account);
          if (voted) {
            newUserVotes.set(i, Number(voteType));
          }
        }
      }

      // Ordenar propuestas: más nuevas primero (ID descendente)
      proposalList.reverse();

      setProposals(proposalList);
      setUserVotes(newUserVotes); // Reemplazar completamente el mapa
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };

  useEffect(() => {
    // Limpiar votos del usuario anterior cuando cambia la cuenta
    setUserVotes(new Map());
    
    if (isConnected) {
      fetchProposals();
      
      // Polling cada 5 segundos para actualizar propuestas
      const interval = setInterval(fetchProposals, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, daoContract, account, refreshTrigger]);

  const handleVote = async (proposalId: number, voteType: number) => {
    if (!daoContract || !forwarderContract || !signer || !account) return;

    setLoading(true);
    try {
      const iface = new ethers.Interface([
        'function vote(uint256 _proposalId, uint8 _voteType)',
      ]);
      const data = iface.encodeFunctionData('vote', [proposalId, voteType]);

      const request = await buildRequest(await daoContract.getAddress(), data);
      const { request: signedRequest, signature } = await signMetaTxRequest(
        signer,
        forwarderContract,
        request
      );

      const response = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            from: signedRequest.from,
            to: signedRequest.to,
            value: signedRequest.value.toString(),
            gas: signedRequest.gas.toString(),
            nonce: signedRequest.nonce.toString(),
            data: signedRequest.data,
          },
          signature,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Actualizar userVotes inmediatamente (optimistic update)
        setUserVotes((prev) => new Map(prev).set(proposalId, voteType));
        
        // Mostrar mensaje de éxito
        const voteTypeText = ['FOR', 'AGAINST', 'ABSTAIN'][voteType];
        alert(`✅ Vote ${voteTypeText} submitted successfully!\n\n(Gasless transaction - no gas fees paid)`);
        
        // Esperar un momento y refrescar
        setTimeout(() => {
          fetchProposals();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to relay transaction');
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      alert('❌ Error voting: ' + (error.message || 'Failed to vote'));
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (proposal: Proposal) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    
    if (proposal.executed) return { text: 'Executed', color: 'bg-gray-500' };
    if (now < proposal.deadline) return { text: 'Active', color: 'bg-green-500' };
    if (proposal.votesFor > proposal.votesAgainst) return { text: 'Approved', color: 'bg-blue-500' };
    return { text: 'Rejected', color: 'bg-red-500' };
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg">
        Please connect your wallet to view proposals
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-gray-100 border border-gray-300 text-gray-800 px-4 py-3 rounded-lg">
        No proposals yet. Create the first one!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Proposals</h2>
      
      {proposals.map((proposal) => {
        const status = getStatus(proposal);
        const isActive = BigInt(Math.floor(Date.now() / 1000)) < proposal.deadline;
        const userVote = userVotes.get(Number(proposal.id));
        const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
        const totalVotesNumber = Number(totalVotes);
        const votesForCount = Number(proposal.votesFor);
        const votesAgainstCount = Number(proposal.votesAgainst);
        const votesAbstainCount = Number(proposal.votesAbstain);

        return (
          <div key={proposal.id.toString()} className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Proposal #{proposal.id.toString()}</h3>
              <span className={`${status.color} text-white px-3 py-1 rounded-full text-sm`}>
                {status.text}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-gray-700">
                <span className="font-semibold">Recipient:</span>{' '}
                {proposal.recipient.slice(0, 10)}...{proposal.recipient.slice(-8)}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Amount:</span>{' '}
                {ethers.formatEther(proposal.amount)} ETH
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Description:</span>{' '}{proposal.description}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Deadline:</span>{' '}
                {new Date(Number(proposal.deadline) * 1000).toLocaleString()}
                {isActive && (
                  <span className="ml-2 text-sm text-green-600">
                    (Active - voting open)
                  </span>
                )}
                {!isActive && !proposal.executed && (
                  <span className="ml-2 text-sm text-orange-600">
                    (Closed - waiting execution)
                  </span>
                )}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">Votes:</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-600">✓ For:</span>
                  <span className="font-bold">
                    {votesForCount} vote{votesForCount === 1 ? '' : 's'}
                    {totalVotes > 0n && ` (${((votesForCount / totalVotesNumber) * 100).toFixed(1)}%)`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600">✗ Against:</span>
                  <span className="font-bold">
                    {votesAgainstCount} vote{votesAgainstCount === 1 ? '' : 's'}
                    {totalVotes > 0n && ` (${((votesAgainstCount / totalVotesNumber) * 100).toFixed(1)}%)`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">- Abstain:</span>
                  <span className="font-bold">
                    {votesAbstainCount} vote{votesAbstainCount === 1 ? '' : 's'}
                    {totalVotes > 0n && ` (${((votesAbstainCount / totalVotesNumber) * 100).toFixed(1)}%)`}
                  </span>
                </div>
              </div>
            </div>

            {userVote !== undefined && (
              <div className={`px-4 py-3 rounded-lg mb-4 font-semibold ${
                userVote === 0 ? 'bg-green-100 border-2 border-green-500 text-green-800' :
                userVote === 1 ? 'bg-red-100 border-2 border-red-500 text-red-800' :
                'bg-gray-100 border-2 border-gray-500 text-gray-800'
              }`}>
                ✓ You voted: <span className="font-bold">{['FOR', 'AGAINST', 'ABSTAIN'][userVote]}</span>
                {proposal.executed && <span className="ml-2 text-sm">(Proposal executed)</span>}
              </div>
            )}

            {isActive && !proposal.executed && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleVote(Number(proposal.id), 0)}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {loading ? '⏳ Processing...' : '✓ Vote FOR'}
                </button>
                <button
                  onClick={() => handleVote(Number(proposal.id), 1)}
                  disabled={loading}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {loading ? '⏳ Processing...' : '✗ Vote AGAINST'}
                </button>
                <button
                  onClick={() => handleVote(Number(proposal.id), 2)}
                  disabled={loading}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {loading ? '⏳ Processing...' : '- Abstain'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
