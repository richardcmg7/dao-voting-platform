'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ethers } from 'ethers';

export default function FundingPanel() {
  const { account, daoContract, isConnected } = useWeb3();
  const [amount, setAmount] = useState('');
  const [userBalance, setUserBalance] = useState('0');
  const [totalBalance, setTotalBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    if (!daoContract || !account) return;
    
    try {
      const userBal = await daoContract.getUserBalance(account);
      const totalBal = await daoContract.totalBalance();
      
      setUserBalance(ethers.formatEther(userBal));
      setTotalBalance(ethers.formatEther(totalBal));
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    if (isConnected && account && daoContract) {
      fetchBalances();
      
      // Polling cada 3 segundos para actualizar balances
      const interval = setInterval(fetchBalances, 3000);
      
      return () => clearInterval(interval);
    } else {
      // Limpiar balances si no hay cuenta conectada
      setUserBalance('0');
      setTotalBalance('0');
    }
  }, [isConnected, account, daoContract]);

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoContract || !amount) return;

    setLoading(true);
    try {
      const tx = await daoContract.fundDAO({
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      
      alert('Funds deposited successfully!');
      setAmount('');
      await fetchBalances();
    } catch (error: any) {
      console.error('Error funding DAO:', error);
      alert('Error: ' + (error.message || 'Failed to fund DAO'));
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg">
        Please connect your wallet to fund the DAO
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Fund DAO</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Your Balance in DAO</p>
          <p className="text-2xl font-bold text-blue-600">{userBalance} ETH</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total DAO Balance</p>
          <p className="text-2xl font-bold text-purple-600">{totalBalance} ETH</p>
        </div>
      </div>

      <form onSubmit={handleFund} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (ETH)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.1"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          {loading ? 'Processing...' : 'Deposit ETH'}
        </button>
      </form>
    </div>
  );
}
