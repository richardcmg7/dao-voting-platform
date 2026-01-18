'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';

export default function DebugTimePanel() {
  const { provider } = useWeb3();
  const [chainTime, setChainTime] = useState<number | null>(null);
  const [realTime, setRealTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Update clocks locally
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTime(Math.floor(Date.now() / 1000));
      setChainTime(prev => prev ? prev + 1 : null);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync with actual chain time
  const syncTime = async () => {
    if (provider) {
      try {
        const block = await provider.getBlock('latest');
        if (block) {
            setChainTime(block.timestamp);
        }
      } catch (e) {
        console.error("Sync failed", e);
      }
    }
  };

  useEffect(() => {
    syncTime();
    const interval = setInterval(syncTime, 5000);
    return () => clearInterval(interval);
  }, [provider]);

  const advanceTime = async (seconds: number) => {
    setLoading(true);
    try {
      await fetch('/api/debug/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds }),
      });
      await syncTime();
      // Force page reload to update other components? No, context updates should be enough mostly.
      // But triggering a global refresh might be nice. For now, rely on individual component polling.
    } catch (err) {
      console.error(err);
      alert('Failed to advance time');
    } finally {
      setLoading(false);
    }
  };

  if (!chainTime) return null;

  const offset = chainTime - realTime;
  const isAhead = offset > 5; // Tolerance

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all"
          title="Open Time Controls"
        >
          ⏱️
        </button>
      )}

      {isOpen && (
        <div className="bg-white border border-gray-200 shadow-2xl rounded-xl p-4 w-80 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    ⏱️ Time Machine
                </h3>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Real Time:</span>
                    <span className="font-mono">{new Date(realTime * 1000).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-blue-600 font-semibold">Chain Time:</span>
                    <span className="font-mono font-bold text-blue-700">{new Date(chainTime * 1000).toLocaleTimeString()}</span>
                </div>
                
                <div className={`text-xs text-center p-1 rounded ${isAhead ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {isAhead 
                        ? `⚠️ Chain is ${Math.floor(offset / 60)}m ${offset % 60}s ahead` 
                        : '✅ Synced with reality'}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                    <button 
                        onClick={() => advanceTime(60)}
                        disabled={loading}
                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-center transition"
                    >
                        +1 min
                    </button>
                    <button 
                        onClick={() => advanceTime(300)}
                        disabled={loading}
                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-center transition"
                    >
                        +5 min
                    </button>
                    <button 
                        onClick={() => advanceTime(3600)}
                        disabled={loading}
                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-center transition"
                    >
                        +1 hour
                    </button>
                </div>
                <button 
                    onClick={() => advanceTime(86400)}
                    disabled={loading}
                    className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded text-center transition mt-2"
                >
                    +1 Day
                </button>
            </div>
            {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">⏳</div>}
        </div>
      )}
    </div>
  );
}
