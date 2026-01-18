'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ethers } from 'ethers';
import { useNotifications } from '@/components/Notifications';
import { toErrorMessage } from '@/lib/errors';

export default function FundingPanel() {
  const { daoContract, account, isConnected } = useWeb3();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [daoBalance, setDaoBalance] = useState('0');
  const { notify } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchBalances = async () => {
    if (daoContract && account) {
      try {
        const userBal = await daoContract.getUserBalance(account);
        const totalBal = await daoContract.totalBalance();
        setBalance(ethers.formatEther(userBal));
        setDaoBalance(ethers.formatEther(totalBal));
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchBalances();
      const interval = setInterval(fetchBalances, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, daoContract, account]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoContract) return;

    setLoading(true);
    try {
      const tx = await daoContract.fundDAO({
        value: ethers.parseEther(amount),
      });
      notify({ type: 'info', title: 'Transaction sent', message: 'Waiting for confirmation...' });
      
      await tx.wait();
      
      notify({ type: 'success', title: 'Deposit successful', message: `${amount} ETH deposited to DAO` });
      setAmount('');
      fetchBalances();
    } catch (error: unknown) {
      notify({ type: 'error', title: 'Deposit failed', message: toErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
      {/* Header - Always visible */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex items-center justify-between text-white transition-all hover:brightness-110"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="font-bold text-lg leading-tight">DAO Treasury</h2>
            <p className="text-emerald-100 text-xs font-mono">Total: {parseFloat(daoBalance).toFixed(2)} ETH</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {!isExpanded && (
             <span className="text-xs bg-white/20 px-2 py-1 rounded text-white font-medium">
               My Balance: {parseFloat(balance).toFixed(2)}
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
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 bg-gradient-to-b from-white to-gray-50">
          <div className="mb-6 flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <span className="text-gray-600 font-medium">Your DAO Stake</span>
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {parseFloat(balance).toFixed(4)} <span className="text-sm text-emerald-500">ETH</span>
            </span>
          </div>

          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deposit Funds
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow outline-none"
                  placeholder="0.00"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <span className="text-gray-400 font-bold">ETH</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Fund Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
