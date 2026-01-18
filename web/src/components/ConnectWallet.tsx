'use client';

import { useWeb3 } from '@/context/Web3Context';

export default function ConnectWallet() {
  const { account, connectWallet, disconnectWallet, isConnected } = useWeb3();

  return (
    <div className="mb-6">
      {!isConnected ? (
        <button
          onClick={connectWallet}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">Connected:</span>{' '}
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </div>
          <button
            onClick={disconnectWallet}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
