type EthereumRequest = {
  method: string;
  params?: unknown[];
};

interface EthereumProvider {
  request: (args: EthereumRequest) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

interface Window {
  ethereum?: EthereumProvider;
}
