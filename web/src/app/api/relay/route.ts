import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { FORWARDER_ABI } from '@/lib/abi';

type ForwardRequestInput = {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  data: string;
};

type ForwardRequestPayload = {
  request: ForwardRequestInput;
  signature: string;
};

const isForwardRequestInput = (value: unknown): value is ForwardRequestInput => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.from === 'string' &&
    typeof record.to === 'string' &&
    typeof record.value === 'string' &&
    typeof record.gas === 'string' &&
    typeof record.nonce === 'string' &&
    typeof record.data === 'string'
  );
};

const isForwardRequestPayload = (value: unknown): value is ForwardRequestPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.signature === 'string' && isForwardRequestInput(record.request);
};

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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!isForwardRequestPayload(payload)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const { request: forwardRequest, signature } = payload;

    const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
    const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
    const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;

    if (!RELAYER_PRIVATE_KEY || !FORWARDER_ADDRESS) {
      return NextResponse.json(
        { error: 'Relayer not configured' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const forwarder = new ethers.Contract(
      FORWARDER_ADDRESS,
      FORWARDER_ABI,
      relayerWallet
    );

    const currentNonce = await forwarder.getNonce(forwardRequest.from);
    if (BigInt(forwardRequest.nonce) !== currentNonce) {
      return NextResponse.json(
        { error: 'Nonce mismatch', expected: currentNonce.toString(), got: forwardRequest.nonce },
        { status: 400 }
      );
    }

    const requestTuple = {
      from: forwardRequest.from,
      to: forwardRequest.to,
      value: BigInt(forwardRequest.value),
      gas: BigInt(forwardRequest.gas),
      nonce: BigInt(forwardRequest.nonce),
      data: forwardRequest.data,
    };

    const tx = await forwarder.execute(requestTuple, signature);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    console.error('Relay error:', message);
    return NextResponse.json(
      { error: message || 'Failed to relay transaction' },
      { status: 500 }
    );
  }
}
