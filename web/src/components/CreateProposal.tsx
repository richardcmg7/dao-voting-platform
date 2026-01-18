'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { ethers } from 'ethers';

export default function CreateProposal({ onProposalCreated }: { onProposalCreated?: () => void }) {
  const { account, daoContract, isConnected } = useWeb3();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const checkCanCreate = async () => {
      if (!daoContract || !account) return;
      
      try {
        const can = await daoContract.canCreateProposal(account);
        setCanCreate(can);
      } catch (error) {
        console.error('Error checking creation permission:', error);
      }
    };

    if (isConnected) {
      checkCanCreate();
      
      // Polling cada 3 segundos para detectar cambios en balance
      const interval = setInterval(checkCanCreate, 3000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, account, daoContract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoContract) return;

    setLoading(true);
    try {
      // Validar que sea una dirección válida (no ENS)
      if (!ethers.isAddress(recipient)) {
        alert('Invalid Ethereum address. Please enter a valid address starting with 0x');
        setLoading(false);
        return;
      }

      const amountWei = ethers.parseEther(amount);
      const durationSeconds = parseInt(duration) * 60; // Convert minutes to seconds

      const tx = await daoContract.createProposal(
        recipient,
        amountWei,
        durationSeconds,
        description
      );
      await tx.wait();

      alert('Proposal created successfully!');
      setRecipient('');
      setAmount('');
      setDuration('');
      setDescription('');
      
      if (onProposalCreated) {
        onProposalCreated();
      }
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      alert('Error: ' + (error.message || 'Failed to create proposal'));
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg">
        Please connect your wallet to create proposals
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-lg">
        You need at least 10% of the total DAO balance to create proposals
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Create Proposal</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Must be a valid Ethereum address (42 characters starting with 0x)
          </p>
        </div>

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
            placeholder="1.0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voting Duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="60"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your proposal..."
            rows={4}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          {loading ? 'Creating...' : 'Create Proposal'}
        </button>
      </form>
    </div>
  );
}
