'use client';

import { useState } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import FundingPanel from '@/components/FundingPanel';
import CreateProposal from '@/components/CreateProposal';
import ProposalList from '@/components/ProposalList';
import DebugTimePanel from '@/components/DebugTimePanel';
import { NotificationProvider } from '@/components/Notifications';
import { Web3Provider } from '@/context/Web3Context';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProposalCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <NotificationProvider>
      <Web3Provider>
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-6">
          <div className="container mx-auto px-4 max-w-6xl">
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-gray-200/50">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">🏛️</span>
                DAO Governance
              </h1>
              <p className="text-gray-500 text-sm mt-1 ml-14">
                Gasless voting powered by ERC-2771
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <ConnectWallet />
            </div>
          </header>

          <div className="grid lg:grid-cols-12 gap-8 mb-6 items-start">
            {/* Left Column: Actions (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <FundingPanel />
              <CreateProposal onProposalCreated={handleProposalCreated} />
            </div>

            {/* Right Column: Proposals (8 cols) */}
            <div className="lg:col-span-8">
              <ProposalList refreshTrigger={refreshTrigger} />
            </div>
          </div>

          <footer className="mt-12 text-center text-gray-600 text-sm">
            <p>Built with Next.js 15, Solidity, and Foundry</p>
            <p className="mt-2">EIP-2771 Meta-Transactions • Gasless Voting</p>
          </footer>
          </div>
          <DebugTimePanel />
        </main>
      </Web3Provider>
    </NotificationProvider>
  );
}
