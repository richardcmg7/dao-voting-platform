#!/bin/bash

echo "🚀 Deploying contracts and starting app..."
echo ""

# Check Anvil
if ! curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo "❌ Anvil is not running!"
    echo "Please start Anvil first: anvil"
    exit 1
fi

echo "✓ Anvil is running"
echo ""

# Deploy
cd sc
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "Deploying contracts..."
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast 2>&1 | tee /tmp/deploy.log

echo ""
echo "Extract these addresses and update web/.env.local:"
echo ""
grep "MinimalForwarder deployed at:" /tmp/deploy.log
grep "DAOVoting deployed at:" /tmp/deploy.log
echo ""

# Extract addresses
FORWARDER=$(grep "MinimalForwarder deployed at:" /tmp/deploy.log | grep -o "0x[a-fA-F0-9]\{40\}")
DAO=$(grep "DAOVoting deployed at:" /tmp/deploy.log | grep -o "0x[a-fA-F0-9]\{40\}")

cd ../web

# Update .env.local
cat > .env.local << EOF
NEXT_PUBLIC_DAO_ADDRESS=$DAO
NEXT_PUBLIC_FORWARDER_ADDRESS=$FORWARDER
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC_URL=http://127.0.0.1:8545
EOF

echo "✓ Environment configured"
echo ""
echo "Addresses saved:"
echo "  Forwarder: $FORWARDER"
echo "  DAO: $DAO"
echo ""

# Kill any existing Next.js process
pkill -f "next dev" 2>/dev/null

echo "Starting Next.js..."
echo "Open http://localhost:3000"
echo ""

npm run dev
