'use client';

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ethers } from 'ethers';
import { useNotifications } from '@/components/Notifications';
import { toErrorMessage } from '@/lib/errors';

export default function CreateProposal({ onProposalCreated }: { onProposalCreated?: () => void }) {
  const { daoContract, isConnected, account } = useWeb3();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('300'); // Default 5 minutes
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoContract) return;

    setLoading(true);
    try {
      const trimmedRecipient = recipient.trim();
      const trimmedDescription = description.trim();

      // Validar balance elegible
      const canCreate = await daoContract.canCreateProposal(account);
      if (!canCreate) {
        throw new Error("You need at least 10% of total DAO balance to create a proposal");
      }

      const tx = await daoContract.createProposal(
        trimmedRecipient,
        ethers.parseEther(amount),
        duration,
        trimmedDescription
      );
      
      notify({ type: 'info', title: 'Creating Proposal', message: 'Transaction sent...' });
      
      await tx.wait();
      
      notify({ type: 'success', title: 'Success', message: 'Proposal created successfully!' });
      
      // Reset form and collapse
      setRecipient('');
      setAmount('');
      setDescription('');
      setIsExpanded(false);
      
      if (onProposalCreated) onProposalCreated();
    } catch (error: unknown) {
      notify({ type: 'error', title: 'Creation failed', message: toErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl h-fit">
      {/* Header - Always visible */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-between text-white transition-all hover:brightness-110"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="font-bold text-lg leading-tight">New Proposal</h2>
            <p className="text-blue-100 text-xs font-mono">Create & Vote</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {!isExpanded && (
             <span className="text-xs bg-white/20 px-2 py-1 rounded text-white font-medium opacity-80">
               Click to expand
             </span>
           )}
           <svg 
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content - Collapsible */}
      <div 
        className={`transition-[max-height,opacity] duration-500 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 bg-gradient-to-b from-white to-gray-50">
          <form onSubmit={handleCreate} className="space-y-4">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Target Wallet</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none font-mono text-sm"
                placeholder="0x..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (ETH)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none"
                  placeholder="0.0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (Sec)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none"
                  placeholder="300"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none resize-none h-24"
                placeholder="Describe your proposal..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {loading ? (
                 <>
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Deploying...
               </>
              ) : (
                'Submit Proposal'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
