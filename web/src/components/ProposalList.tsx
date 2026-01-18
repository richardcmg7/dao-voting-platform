'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useNotifications } from '@/components/Notifications';
import { ethers } from 'ethers';
import { signMetaTxRequest, buildRequest } from '@/lib/metaTx';
import { toErrorMessage } from '@/lib/errors';

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

interface ProposalStatus {
  serverTimestamp: number;
  executionDelay: number;
  deadline: number;
  diagnostics: string[];
  canExecuteBefore: boolean;
  executed: boolean;
  txHash: string | null;
  lastChecked: string;
}

// Sub-component for individual cards
const ProposalCard = ({ 
  proposal, 
  userVote, 
  daoContract, 
  forwarderContract, 
  signer, 
  account, 
  notify, 
  refreshProposals,
  displayTime,
  loading: globalLoading
}: {
  proposal: Proposal;
  userVote?: number;
  daoContract: ethers.Contract | null;
  forwarderContract: ethers.Contract | null;
  signer: ethers.Signer | null;
  account: string | null;
  notify: any;
  refreshProposals: () => void;
  displayTime: number | null;
  loading: boolean;
}) => {
  // Logic to determine status
  const now = displayTime !== null ? BigInt(displayTime) : BigInt(Math.floor(Date.now() / 1000));
  const isActive = now < proposal.deadline;
  
  // Default Expanded: Only if Active and Not Executed
  const [isExpanded, setIsExpanded] = useState(isActive && !proposal.executed);
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<ProposalStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);

  const getStatus = () => {
    if (proposal.executed) return { text: 'Executed', color: 'bg-gray-500', badge: 'gray' };
    if (isActive) return { text: 'Active', color: 'bg-green-500', badge: 'green' };
    if (proposal.votesFor > proposal.votesAgainst) return { text: 'Approved', color: 'bg-blue-500', badge: 'blue' };
    return { text: 'Rejected', color: 'bg-red-500', badge: 'red' };
  };

  const status = getStatus();
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const totalVotesNumber = Number(totalVotes);

  // Voting Logic
  const handleVote = async (voteType: number) => {
    if (!daoContract || !forwarderContract || !signer || !account) return;
    setLoading(true);
    try {
      const iface = new ethers.Interface(['function vote(uint256 _proposalId, uint8 _voteType)']);
      const data = iface.encodeFunctionData('vote', [proposal.id, voteType]);
      const request = await buildRequest(await daoContract.getAddress(), data);
      const { request: signedRequest, signature } = await signMetaTxRequest(signer, forwarderContract, request);

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
        await response.json();
        notify({ type: 'success', title: 'Vote sent', message: 'Vote relayed successfully.' });
        
        // Aggressive polling to update UI faster
        refreshProposals(); 
        setTimeout(refreshProposals, 1000);
        setTimeout(refreshProposals, 3000);
        setTimeout(refreshProposals, 5000);
      } else {
        throw new Error((await response.json()).error || 'Failed to relay');
      }
    } catch (error: unknown) {
      notify({ type: 'error', title: 'Vote failed', message: toErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  // Status/Execute Logic
  const updateStatus = async (execute: boolean) => {
    const response = await fetch('/api/execute-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: Number(proposal.id), debugOnly: !execute }),
    });

    if (!response.ok) throw new Error((await response.json()).error || 'API failed');
    const data = await response.json();

    const newStatus: ProposalStatus = {
      serverTimestamp: data.serverTimestamp,
      executionDelay: data.executionDelay,
      deadline: data.deadline,
      diagnostics: Array.isArray(data.diagnostics) ? data.diagnostics : [],
      canExecuteBefore: Boolean(data.canExecuteBefore),
      executed: Boolean(data.executed),
      txHash: typeof data.txHash === 'string' ? data.txHash : null,
      lastChecked: new Date().toISOString(),
    };
    setStatusInfo(newStatus);
    return newStatus;
  };

  const handleStatusCheck = async () => {
    setStatusLoading(true);
    try { await updateStatus(false); } 
    catch (e) { notify({ type: 'error', message: toErrorMessage(e) }); } 
    finally { setStatusLoading(false); }
  };

  const handleExecute = async () => {
    setExecuteLoading(true);
    try { 
      const res = await updateStatus(true);
      if (res.executed) {
        notify({ type: 'success', title: 'Executed', message: 'Proposal executed successfully' });
        setStatusInfo(null); // Close panel
        refreshProposals();
      } else {
        notify({ type: 'warning', message: 'Conditions not met yet' });
      }
    } catch (e) { notify({ type: 'error', message: toErrorMessage(e) }); } 
    finally { setExecuteLoading(false); }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md ${isExpanded ? 'ring-1 ring-blue-100' : ''}`}>
      {/* Card Header (Clickable) */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proposal</span>
            <span className="text-xl font-bold text-gray-800">#{proposal.id.toString()}</span>
          </div>
          
          <div className="hidden sm:block h-8 w-px bg-gray-200 mx-2"></div>

          <div className="flex flex-col flex-1 min-w-0">
             <span className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-md">
                {proposal.description}
             </span>
             <div className="flex gap-3 text-xs text-gray-500 mt-1">
                <span>{ethers.formatEther(proposal.amount)} ETH</span>
                <span>•</span>
                <span>To: {proposal.recipient.slice(0,6)}...{proposal.recipient.slice(-4)}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`${status.color} text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm`}>
            {status.text}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 group-hover:text-gray-600 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      <div className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-gray-700 font-medium">Description:</p>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg mt-1">{proposal.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                 <span className="text-gray-500">Deadline:</span>
                 <p className="font-medium">{new Date(Number(proposal.deadline) * 1000).toLocaleString()}</p>
               </div>
               <div>
                  <span className="text-gray-500">Status Detail:</span>
                  <p className="font-medium">
                    {isActive ? 'Voting Open' : proposal.executed ? 'Completed' : status.text === 'Approved' ? 'Passed (Waiting Exec)' : 'Rejected'}
                  </p>
               </div>
            </div>
          </div>

          {/* Voting Stats */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
             <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Voting Results</h4>
             <div className="space-y-3">
               {/* For */}
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-green-700 font-medium">For</span>
                   <span className="font-bold">{Number(proposal.votesFor)}</span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-green-500 h-2 rounded-full transition-all" 
                     style={{width: `${totalVotesNumber > 0 ? (Number(proposal.votesFor)/totalVotesNumber)*100 : 0}%`}}
                   ></div>
                 </div>
               </div>
               {/* Against */}
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-red-700 font-medium">Against</span>
                   <span className="font-bold">{Number(proposal.votesAgainst)}</span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-red-500 h-2 rounded-full transition-all" 
                     style={{width: `${totalVotesNumber > 0 ? (Number(proposal.votesAgainst)/totalVotesNumber)*100 : 0}%`}}
                   ></div>
                 </div>
               </div>
             </div>
          </div>

          {/* User Vote Badge */}
          {userVote !== undefined && (
             <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm font-medium ${
               userVote === 0 ? 'bg-green-50 text-green-700 border border-green-200' :
               userVote === 1 ? 'bg-red-50 text-red-700 border border-red-200' :
               'bg-gray-50 text-gray-700 border border-gray-200'
             }`}>
               <span>Your Vote:</span>
               <span className="font-bold uppercase">{['FOR', 'AGAINST', 'ABSTAIN'][userVote]}</span>
               {proposal.executed && <span className="ml-auto text-xs opacity-75">(Proposal executed)</span>}
             </div>
          )}

          {/* Execution Status Panel */}
          {statusInfo && (
             <div className="bg-blue-50 p-4 rounded-xl mb-4 relative animate-in fade-in">
                <button 
                  onClick={() => setStatusInfo(null)}
                  className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 font-bold"
                >✕</button>
                
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Execution Diagnostics</h4>
                <div className="text-xs font-mono text-blue-800 space-y-1">
                   <p>Node Time: {new Date(statusInfo.serverTimestamp * 1000).toLocaleTimeString()}</p>
                   <p>Exec Status: {proposal.executed ? 'DONE' : statusInfo.canExecuteBefore ? 'READY' : 'WAITING'}</p>
                   <ul className="list-disc pl-4 mt-2 opacity-80">
                      {statusInfo.diagnostics.map((d, i) => <li key={i}>{d}</li>)}
                   </ul>
                </div>
             </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
             {isActive && !proposal.executed && (
                <>
                  <button onClick={() => handleVote(0)} disabled={loading || globalLoading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-sm">
                    {loading ? '...' : 'Vote FOR'}
                  </button>
                  <button onClick={() => handleVote(1)} disabled={loading || globalLoading} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-sm">
                    {loading ? '...' : 'Vote AGAINST'}
                  </button>
                </>
             )}

             <div className="flex-1 flex gap-2">
                <button 
                   onClick={handleStatusCheck} 
                   disabled={statusLoading}
                   className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition"
                >
                   {statusLoading ? 'Check...' : 'Status'}
                </button>
                <button 
                   onClick={handleExecute} 
                   disabled={executeLoading || proposal.executed}
                   className={`flex-1 font-bold py-2.5 px-4 rounded-lg transition shadow-sm text-white ${
                     proposal.executed 
                       ? 'bg-gray-400 cursor-not-allowed' 
                       : 'bg-indigo-600 hover:bg-indigo-700'
                   }`}
                >
                   {executeLoading ? 'Exec...' : proposal.executed ? '✓ Done' : 'Execute'}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};


export default function ProposalList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { account, daoContract, forwarderContract, signer, isConnected, provider } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotes, setUserVotes] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [currentBlockTime, setCurrentBlockTime] = useState<number | null>(null);
  const [displayTime, setDisplayTime] = useState<number | null>(null);
  const { notify } = useNotifications();

  // Sync displayTime with block time when fetched
  useEffect(() => {
    if (currentBlockTime) setDisplayTime(currentBlockTime);
  }, [currentBlockTime]);

  // Tick the clock
  useEffect(() => {
    const interval = setInterval(() => setDisplayTime((prev) => (prev ? prev + 1 : null)), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchProposals = useCallback(async () => {
    if (!daoContract) return;
    try {
      if (provider) {
        try {
          const block = await provider.getBlock('latest');
          if (block) {
            setCurrentBlockTime(block.timestamp);
            if (!displayTime || Math.abs(block.timestamp - displayTime) > 5) setDisplayTime(block.timestamp);
          }
        } catch (err) { console.error(err); }
      }

      const count = await daoContract.proposalCount();
      const proposalList: Proposal[] = [];
      const newUserVotes = new Map<number, number>();

      for (let i = 1; i <= Number(count); i++) {
        const proposal = await daoContract.getProposal(i);
        proposalList.push(proposal);
        if (account) {
          const [voted, voteType] = await daoContract.getUserVote(i, account);
          if (voted) newUserVotes.set(i, Number(voteType));
        }
      }
      setProposals(proposalList.reverse());
      setUserVotes(newUserVotes);
    } catch (error) {
      console.error('Error fetching proposals:', toErrorMessage(error));
    }
  }, [daoContract, account, provider]);

  useEffect(() => {
    setUserVotes(new Map());
    if (isConnected) {
      fetchProposals();
      const interval = setInterval(fetchProposals, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, daoContract, account, refreshTrigger, fetchProposals]);

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-8 rounded-2xl text-center">
        <h3 className="text-xl font-bold mb-2">Connect your Wallet</h3>
        <p>Please connect your MetaMask wallet to view and vote on proposals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2 px-1">
        <h2 className="text-2xl font-bold text-gray-800">Governance Proposals</h2>
        {displayTime && (
            <div className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 font-mono border border-gray-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {new Date(displayTime * 1000).toLocaleTimeString()}
            </div>
        )}
      </div>
      
      {proposals.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 text-gray-500 px-6 py-12 rounded-2xl text-center">
            <p className="text-lg">No proposals found.</p>
            <p className="text-sm">Be the first to create one!</p>
          </div>
      )}

      <div className="space-y-4">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id.toString()}
            proposal={proposal}
            userVote={userVotes.get(Number(proposal.id))}
            daoContract={daoContract}
            forwarderContract={forwarderContract}
            signer={signer}
            account={account}
            notify={notify}
            refreshProposals={fetchProposals}
            displayTime={displayTime}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
