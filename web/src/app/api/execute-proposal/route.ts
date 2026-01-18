import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DAO_ABI } from '@/lib/abi';
import { toErrorMessage } from '@/lib/errors';

type ExecutePayload = {
  proposalId: number;
  debugOnly?: boolean;
};

const isExecutePayload = (value: unknown): value is ExecutePayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.proposalId === 'number' && Number.isInteger(record.proposalId);
};

const describeStatus = (condition: boolean, onPass: string, onFail: string) =>
  condition ? `OK: ${onPass}` : `WAIT: ${onFail}`;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!isExecutePayload(payload)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const { proposalId, debugOnly = false } = payload;

    const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
    const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
    const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS;

    if (!RELAYER_PRIVATE_KEY || !DAO_ADDRESS) {
      return NextResponse.json({ error: 'Relayer not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const dao = new ethers.Contract(DAO_ADDRESS, DAO_ABI, relayerWallet);

    const latestBlock = await provider.getBlock('latest');
    const serverTimestamp = latestBlock?.timestamp ?? Math.floor(Date.now() / 1000);

    const proposal = await dao.getProposal(proposalId);
    const executionDelay = Number(await dao.EXECUTION_DELAY());
    const canExecuteBefore = await dao.canExecuteProposal(proposalId);

    const daoBalance = await provider.getBalance(await dao.getAddress());

    const diagnostics: string[] = [];
    diagnostics.push(`Node time: ${serverTimestamp}`);
    diagnostics.push(`Deadline: ${proposal.deadline.toString()}`);
    diagnostics.push(`Deadline plus delay: ${(Number(proposal.deadline) + executionDelay).toString()}`);
    diagnostics.push(`DAO balance: ${ethers.formatEther(daoBalance)} ETH`);
    diagnostics.push(`Votes FOR: ${proposal.votesFor.toString()}`);
    diagnostics.push(`Votes AGAINST: ${proposal.votesAgainst.toString()}`);

    const notExecuted = !proposal.executed;
    diagnostics.push(describeStatus(notExecuted, 'Proposal not executed yet', 'Proposal already executed'));

    const pastDeadline = serverTimestamp >= Number(proposal.deadline);
    diagnostics.push(
      describeStatus(pastDeadline, 'Voting period ended', 'Voting period still active')
    );

    const pastDelay = serverTimestamp >= Number(proposal.deadline) + executionDelay;
    diagnostics.push(
      describeStatus(pastDelay, 'Execution delay passed', 'Execution delay not reached')
    );

    const hasMajority = proposal.votesFor > proposal.votesAgainst;
    diagnostics.push(describeStatus(hasMajority, 'Proposal approved', 'Proposal lacks majority'));

    const hasFunds = daoBalance >= proposal.amount;
    diagnostics.push(describeStatus(hasFunds, 'DAO has enough funds', 'DAO balance is too low'));

    let executed = proposal.executed;
    let txHash: string | null = null;

    if (!debugOnly && canExecuteBefore && notExecuted) {
      const tx = await dao.executeProposal(proposalId);
      const receipt = await tx.wait();
      txHash = receipt.hash;
      executed = true;
      diagnostics.push('Execution transaction submitted');
    } else if (!debugOnly && !canExecuteBefore) {
      diagnostics.push('Execution skipped: conditions not met');
    }

    return NextResponse.json({
      success: true,
      executed,
      txHash,
      canExecuteBefore,
      serverTimestamp,
      executionDelay,
      deadline: Number(proposal.deadline),
      diagnostics,
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    return NextResponse.json({ error: message || 'Failed to execute proposal' }, { status: 500 });
  }
}
