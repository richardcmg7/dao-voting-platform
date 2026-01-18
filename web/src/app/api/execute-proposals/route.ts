import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DAO_ABI } from '@/lib/abi';

export async function GET(request: NextRequest) {
  try {
    const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
    const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
    const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS;

    if (!RELAYER_PRIVATE_KEY || !DAO_ADDRESS) {
      return NextResponse.json(
        { error: 'Daemon not configured' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const dao = new ethers.Contract(DAO_ADDRESS, DAO_ABI, relayerWallet);

    const proposalCount = await dao.proposalCount();
    const executed: number[] = [];
    const errors: { id: number; error: string }[] = [];

    for (let i = 1; i <= Number(proposalCount); i++) {
      try {
        const canExecute = await dao.canExecuteProposal(i);
        
        if (canExecute) {
          console.log(`Executing proposal ${i}...`);
          const tx = await dao.executeProposal(i);
          await tx.wait();
          executed.push(i);
          console.log(`Proposal ${i} executed successfully`);
        }
      } catch (error: any) {
        console.error(`Error executing proposal ${i}:`, error.message);
        errors.push({ id: i, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      executed,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Daemon error:', error);
    return NextResponse.json(
      { error: error.message || 'Daemon execution failed' },
      { status: 500 }
    );
  }
}
