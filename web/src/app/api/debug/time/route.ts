import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const { seconds } = await request.json();
    
    if (!seconds || typeof seconds !== 'number') {
      return NextResponse.json({ error: 'Invalid seconds parameter' }, { status: 400 });
    }

    const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Increase time
    await provider.send('evm_increaseTime', [seconds]);
    // Mine a block to persist the time change
    await provider.send('evm_mine', []);

    const block = await provider.getBlock('latest');

    return NextResponse.json({ 
      success: true, 
      newTimestamp: block?.timestamp,
      message: `Time advanced by ${seconds} seconds`
    });
  } catch (error: unknown) {
    console.error('Time jump failed:', error);
    return NextResponse.json({ error: 'Failed to advance time' }, { status: 500 });
  }
}
