'use client';

import { useWeb3 } from '@/context/Web3Context';
import { useState } from 'react';

export default function ConnectWallet() {
  const { account, connectWallet, disconnectWallet, isConnected } = useWeb3();
  const [isHovering, setIsHovering] = useState(false);

  if (!isConnected) {
    return (
      <div className="flex justify-center mb-8">
        <button
          onClick={connectWallet}
          className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <svg 
            className="w-5 h-5 mr-2 -ml-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-8">
      <div 
        className="relative group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-1.5 pr-6 flex items-center gap-3"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Network Status Dot */}
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>

        {/* Avatar Placeholder (Gradient) */}
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
          {account?.substring(2, 4).toUpperCase()}
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Connected Account</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-gray-800 font-bold text-lg tracking-tight">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(account || '');
                // Optional: Show toast
              }}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Copy Address"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-l border-gray-200 h-8 mx-2"></div>

        <button
          onClick={disconnectWallet}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
          title="Disconnect"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
