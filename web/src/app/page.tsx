'use client';

import { useState } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import FundingPanel from '@/components/FundingPanel';
import CreateProposal from '@/components/CreateProposal';
import ProposalList from '@/components/ProposalList';
import { Web3Provider } from '@/context/Web3Context';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProposalCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Web3Provider>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-2">
              🏛️ DAO Voting Platform
            </h1>
            <p className="text-gray-600 text-lg">
              Gasless voting powered by meta-transactions
            </p>
          </header>

          <ConnectWallet />

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <FundingPanel />
            <CreateProposal onProposalCreated={handleProposalCreated} />
          </div>

          <ProposalList refreshTrigger={refreshTrigger} />

          <footer className="mt-12 text-center text-gray-600 text-sm">
            <p>Built with Next.js 15, Solidity, and Foundry</p>
            <p className="mt-2">EIP-2771 Meta-Transactions • Gasless Voting</p>
          </footer>
        </div>
      </main>
    </Web3Provider>
  );
}
