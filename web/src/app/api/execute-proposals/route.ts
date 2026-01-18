import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DAO_ABI } from '@/lib/abi';

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};

export async function GET() {
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
    const executionDelay = Number(await dao.EXECUTION_DELAY());
    const shouldAutoAdvance = process.env.AUTO_ADVANCE_TIME === 'true';

    const maybeAdvanceTime = async (deadline: bigint) => {
      if (!shouldAutoAdvance) {
        return;
      }

      const latestBlock = await provider.getBlock('latest');
      if (!latestBlock) {
        return;
      }

      const targetTimestamp = Number(deadline) + executionDelay;
      if (latestBlock.timestamp >= targetTimestamp) {
        return;
      }

      const delta = targetTimestamp - latestBlock.timestamp;
      try {
        await provider.send('evm_increaseTime', [delta]);
        await provider.send('evm_mine', []);
      } catch (rpcError) {
        console.warn('Auto time advance failed:', toErrorMessage(rpcError));
      }
    };

    const proposalCount = await dao.proposalCount();
    const executed: number[] = [];
    const errors: { id: number; error: string }[] = [];

    for (let i = 1; i <= Number(proposalCount); i++) {
      try {
        const proposal = await dao.getProposal(i);
        await maybeAdvanceTime(proposal.deadline);

        const canExecute = await dao.canExecuteProposal(i);
        
        if (canExecute) {
          console.log(`Executing proposal ${i}...`);
          const tx = await dao.executeProposal(i);
          await tx.wait();
          executed.push(i);
          console.log(`Proposal ${i} executed successfully`);
        }
      } catch (error: unknown) {
        const message = toErrorMessage(error);
        console.error(`Error executing proposal ${i}:`, message);
        errors.push({ id: i, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      executed,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    console.error('Daemon error:', message);
    return NextResponse.json(
      { error: message || 'Daemon execution failed' },
      { status: 500 }
    );
  }
}
