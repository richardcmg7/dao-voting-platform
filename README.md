# DAO Voting Platform with Gasless Transactions

A full-stack decentralized autonomous organization (DAO) platform that allows users to vote on proposals **without paying gas fees** using meta-transactions (EIP-2771).

## 🏗️ Architecture

```
dao-voting-platform/
├── sc/                 # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── MinimalForwarder.sol    # EIP-2771 relayer
│   │   └── DAOVoting.sol           # Main DAO contract
│   ├── test/                       # Contract tests
│   └── script/                     # Deployment scripts
│
└── web/                # Frontend (Next.js 15)
    ├── src/
    │   ├── app/                    # Pages and API routes
    │   ├── components/             # React components
    │   ├── context/                # Web3 context
    │   └── lib/                    # Utilities
    └── .env.local                  # Environment variables
```

## ✨ Features

### Smart Contracts
- **MinimalForwarder**: EIP-2771 compliant contract for meta-transactions
- **DAOVoting**: Main DAO contract with:
  - Proposal creation (requires ≥10% of total balance)
  - Voting system (FOR/AGAINST/ABSTAIN)
  - Automatic execution after deadline + delay
  - Fund management

### Frontend
- **MetaMask Integration**: Connect wallet seamlessly
- **Fund Management**: Deposit ETH to participate in voting
- **Proposal Creation**: Create proposals with recipient, amount, and deadline
- **Gasless Voting**: Vote without paying gas fees via meta-transactions
- **Real-time Updates**: View proposal status and vote counts
- **Automatic Execution**: Background daemon monitors and executes approved proposals

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Foundry (for smart contracts)
- MetaMask browser extension

### Installation

#### 1. Clone the repository

```bash
cd dao-voting-platform
```

#### 2. Install Smart Contract Dependencies

```bash
cd sc
forge install
```

#### 3. Install Frontend Dependencies

```bash
cd ../web
npm install
```

## 🔧 Development Setup

### Step 1: Start Local Blockchain

Open a new terminal and start Anvil (Foundry's local Ethereum node):

```bash
anvil
```

This will start a local blockchain at `http://127.0.0.1:8545` with 10 pre-funded accounts.

**Important**: Copy the private key of Account #0 (or any account) for the relayer.

### Step 2: Deploy Smart Contracts

In a new terminal, navigate to the `sc/` directory:

```bash
cd sc
```

Set your private key (use one of the Anvil accounts):

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Deploy the contracts:

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

**Copy the deployed contract addresses** from the output:
- MinimalForwarder address
- DAOVoting address

### Step 3: Configure Frontend

Navigate to the `web/` directory and create a `.env.local` file:

```bash
cd ../web
cp .env.example .env.local
```

Edit `.env.local` with your deployed contract addresses:

```env
# Contract Addresses (from deployment)
NEXT_PUBLIC_DAO_ADDRESS=0x... # Your DAOVoting address
NEXT_PUBLIC_FORWARDER_ADDRESS=0x... # Your MinimalForwarder address
NEXT_PUBLIC_CHAIN_ID=31337

# Relayer Configuration (Anvil Account #1 or any funded account)
RELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC_URL=http://127.0.0.1:8545
```

### Step 4: Start Frontend

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Step 5: Configure MetaMask

1. Open MetaMask
2. Add a new network:
   - Network Name: `Anvil Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
3. Import an Anvil account using its private key
4. Connect to the application

## 📖 Usage Guide

### 1. Fund the DAO

- Connect your MetaMask wallet
- Use the "Fund DAO" panel to deposit ETH
- Your balance will be used for voting weight

### 2. Create a Proposal

- You need at least 10% of the total DAO balance
- Fill in:
  - Recipient address
  - Amount in ETH
  - Voting duration in minutes
  - Description
- Submit the proposal

### 3. Vote on Proposals

- Click on any active proposal
- Choose: FOR, AGAINST, or ABSTAIN
- Vote is submitted gaslessly (no MetaMask confirmation for gas!)
- You can change your vote before the deadline

### 4. Execute Proposals

Proposals are automatically executed by the daemon when:
- Voting deadline has passed
- Execution delay period (1 minute) has elapsed
- Votes FOR > Votes AGAINST

Manual trigger for daemon:

```bash
curl http://localhost:3000/api/execute-proposals
```

Or set up a cron job to call this endpoint periodically.

## 🧪 Testing

### Smart Contract Tests

```bash
cd sc
forge test
```

Run with verbosity:

```bash
forge test -vvv
```

Test coverage:

```bash
forge coverage
```

### Test Scenarios

All tests are located in `sc/test/`:

1. **DAOVoting.t.sol**: Tests for DAO functionality
   - Funding
   - Proposal creation
   - Voting mechanisms
   - Proposal execution
   - Edge cases

2. **MinimalForwarder.t.sol**: Tests for meta-transactions
   - Signature verification
   - Nonce management
   - Meta-transaction execution

## 🔒 Security Features

- **Nonce tracking**: Prevents replay attacks
- **EIP-712 signatures**: Secure typed data signing
- **ERC-2771 context**: Preserves original sender in meta-transactions
- **Execution delay**: Safety period before proposal execution
- **Balance requirements**: Prevents spam proposals

## 🌐 Meta-Transactions Flow

```
1. User signs transaction off-chain (no gas)
   ↓
2. Signature sent to relayer API
   ↓
3. Relayer validates signature and nonce
   ↓
4. Relayer submits to MinimalForwarder (pays gas)
   ↓
5. MinimalForwarder forwards to DAOVoting
   ↓
6. DAOVoting extracts original sender
   ↓
7. Vote recorded with user's address
```

## 📁 Key Files

### Smart Contracts
- `sc/src/MinimalForwarder.sol`: EIP-2771 forwarder
- `sc/src/DAOVoting.sol`: Main DAO logic
- `sc/script/Deploy.s.sol`: Deployment script

### Frontend
- `web/src/context/Web3Context.tsx`: Web3 connection management
- `web/src/lib/metaTx.ts`: Meta-transaction signing utilities
- `web/src/app/api/relay/route.ts`: Relayer endpoint
- `web/src/app/api/execute-proposals/route.ts`: Execution daemon

### Components
- `ConnectWallet.tsx`: Wallet connection UI
- `FundingPanel.tsx`: Deposit ETH interface
- `CreateProposal.tsx`: Proposal creation form
- `ProposalList.tsx`: Display and vote on proposals

## 🐛 Troubleshooting

### "Insufficient balance to create proposal"
- You need at least 10% of the total DAO balance
- Deposit more ETH or wait for others to join

### "Nonce mismatch" error
- The transaction was already processed
- Refresh the page and try again

### MetaMask not connecting
- Make sure you're on the correct network (Anvil Local)
- Check that Anvil is running on port 8545

### Relayer errors
- Verify `RELAYER_PRIVATE_KEY` in `.env.local`
- Ensure the relayer account has ETH for gas

## 🚀 Deployment to Testnet

### Deploy Contracts

```bash
cd sc
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url <TESTNET_RPC_URL> \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast \
  --verify
```

### Update Frontend Configuration

Update `.env.local` with testnet values:

```env
NEXT_PUBLIC_DAO_ADDRESS=<deployed_dao_address>
NEXT_PUBLIC_FORWARDER_ADDRESS=<deployed_forwarder_address>
NEXT_PUBLIC_CHAIN_ID=<testnet_chain_id>
RELAYER_PRIVATE_KEY=<relayer_private_key>
RPC_URL=<testnet_rpc_url>
```

## 📚 Resources

- [EIP-2771: Secure Protocol for Native Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [Foundry Book](https://book.getfoundry.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ethers.js Documentation](https://docs.ethers.org/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for learning and development.

---

**Built with ❤️ using Next.js 15, Solidity, Foundry, and ethers.js**
