# Quick Start Guide - DAO Voting Platform

This guide will get you up and running in 5 minutes! ⚡

## Step 1: Start Local Blockchain (Terminal 1)

```bash
anvil
```

Leave this running. You should see 10 accounts with private keys.

**Copy Account #0 private key** (starts with `0xac0974...`)
**Copy Account #1 private key** (starts with `0x59c699...`) - for relayer

## Step 2: Deploy Contracts (Terminal 2)

```bash
cd sc

# Use Account #0 private key
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

**Copy the deployed addresses from output:**
- MinimalForwarder deployed at: `0x...`
- DAOVoting deployed at: `0x...`

## Step 3: Configure Frontend (Terminal 2)

```bash
cd ../web

# Create environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_DAO_ADDRESS=PASTE_DAO_ADDRESS_HERE
NEXT_PUBLIC_FORWARDER_ADDRESS=PASTE_FORWARDER_ADDRESS_HERE
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC_URL=http://127.0.0.1:8545
EOF

# Edit the file and replace the addresses
nano .env.local
```

## Step 4: Start Frontend (Terminal 2)

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 5: Start Daemon (Terminal 3)

```bash
cd web
node daemon.js 30
```

This checks for executable proposals every 30 seconds.

## Step 6: Configure MetaMask

1. Open MetaMask
2. Click Networks → Add Network
3. Fill in:
   - **Network Name:** Anvil Local
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH

4. Import Account:
   - Click your account icon → Import Account
   - Paste Account #2 private key from Anvil (starts with `0x5de4...`)

## Step 7: Test the Application

### 7.1 Fund the DAO

1. Click "Connect Wallet" on the web app
2. In "Fund DAO" panel, enter: `10` ETH
3. Click "Deposit ETH"
4. Confirm in MetaMask

### 7.2 Create a Proposal

1. Fill in the form:
   - **Recipient Address:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Account #0)
   - **Amount:** `1.0` ETH
   - **Duration:** `2` minutes
   - **Description:** "Test proposal for funding"

2. Click "Create Proposal"
3. Confirm in MetaMask

### 7.3 Vote Gasless

1. Find your proposal in the list
2. Click "Vote FOR"
3. Sign the message in MetaMask (NO gas fee!)
4. Wait for confirmation

### 7.4 Wait for Execution

After 2 minutes + 1 minute delay, the daemon will automatically execute the proposal.

Check Terminal 3 for execution logs!

## 🎉 Success!

You've successfully:
- ✅ Deployed smart contracts
- ✅ Configured the frontend
- ✅ Created a proposal
- ✅ Voted without paying gas
- ✅ Automatically executed a proposal

## Troubleshooting

### "Insufficient balance to create proposal"
- You need at least 10% of total DAO balance
- If you deposited 10 ETH and you're the only one, you have 100% ✅

### MetaMask rejecting transactions
- Make sure you're on "Anvil Local" network
- Check that Anvil is still running

### Relayer errors
- Verify the private key in `.env.local` is correct
- Make sure the relayer account has ETH (Anvil accounts start with 10000 ETH)

### Daemon not executing
- Check that 3 minutes have passed (2 min deadline + 1 min delay)
- Look at daemon logs for errors
- Verify proposal has more FOR than AGAINST votes

## Next Steps

Try these scenarios:
1. Import another Anvil account and vote against your proposal
2. Create multiple proposals
3. Change your vote before deadline
4. Try to create a proposal with insufficient balance

---

**Happy coding! 🚀**
