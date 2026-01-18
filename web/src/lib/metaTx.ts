import { ethers } from 'ethers';

export interface ForwardRequest {
  from: string;
  to: string;
  value: bigint;
  gas: bigint;
  nonce: bigint;
  data: string;
}

const FORWARD_REQUEST_TYPE = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];

export async function signMetaTxRequest(
  signer: ethers.Signer,
  forwarder: ethers.Contract,
  input: Omit<ForwardRequest, 'nonce' | 'from'>
): Promise<{ request: ForwardRequest; signature: string }> {
  const from = await signer.getAddress();
  const nonce = await forwarder.getNonce(from);
  const chainId = (await signer.provider!.getNetwork()).chainId;

  const request: ForwardRequest = {
    ...input,
    nonce: BigInt(nonce.toString()),
    from,
  };

  const domain = {
    name: 'MinimalForwarder',
    version: '1',
    chainId: Number(chainId),
    verifyingContract: await forwarder.getAddress(),
  };

  const types = {
    ForwardRequest: FORWARD_REQUEST_TYPE,
  };

  const signature = await signer.signTypedData(domain, types, request);

  return { request, signature };
}

export async function buildRequest(
  to: string,
  data: string
): Promise<Omit<ForwardRequest, 'nonce' | 'from'>> {
  return {
    to,
    value: BigInt(0),
    gas: BigInt(2000000),
    data,
  };
}
