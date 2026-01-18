#!/bin/bash

echo "🚀 Starting DAO Voting Platform Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Anvil is running
echo -e "${BLUE}Checking if Anvil is running...${NC}"
if ! curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo -e "${YELLOW}Anvil is not running!${NC}"
    echo "Please start Anvil in another terminal:"
    echo "  anvil"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✓ Anvil is running${NC}"
echo ""

# Deploy contracts
echo -e "${BLUE}Deploying smart contracts...${NC}"
cd sc

export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast > /tmp/deploy_output.txt 2>&1

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Deployment failed! Check the output:${NC}"
    cat /tmp/deploy_output.txt
    exit 1
fi

# Extract addresses from deployment (more flexible parsing)
FORWARDER_ADDRESS=$(grep -oP "MinimalForwarder deployed at: \K0x[a-fA-F0-9]{40}" /tmp/deploy_output.txt | head -1)
DAO_ADDRESS=$(grep -oP "DAOVoting deployed at: \K0x[a-fA-F0-9]{40}" /tmp/deploy_output.txt | head -1)

# If grep -P doesn't work, try basic grep
if [ -z "$FORWARDER_ADDRESS" ]; then
    FORWARDER_ADDRESS=$(grep "MinimalForwarder deployed at:" /tmp/deploy_output.txt | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
fi

if [ -z "$DAO_ADDRESS" ]; then
    DAO_ADDRESS=$(grep "DAOVoting deployed at:" /tmp/deploy_output.txt | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
fi

if [ -z "$FORWARDER_ADDRESS" ] || [ -z "$DAO_ADDRESS" ]; then
    echo -e "${YELLOW}Could not extract contract addresses!${NC}"
    echo "Please check the deployment output:"
    cat /tmp/deploy_output.txt
    echo ""
    echo "Manually update web/.env.local with the deployed addresses"
    exit 1
fi

echo -e "${GREEN}✓ Contracts deployed${NC}"
echo "  MinimalForwarder: $FORWARDER_ADDRESS"
echo "  DAOVoting: $DAO_ADDRESS"
echo ""

# Update .env.local
cd ../web
echo -e "${BLUE}Updating .env.local...${NC}"

cat > .env.local << EOF
# Contract Addresses (Auto-generated from deployment)
NEXT_PUBLIC_DAO_ADDRESS=$DAO_ADDRESS
NEXT_PUBLIC_FORWARDER_ADDRESS=$FORWARDER_ADDRESS
NEXT_PUBLIC_CHAIN_ID=31337

# Relayer Configuration - Anvil Account #1
RELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC_URL=http://127.0.0.1:8545
EOF

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Start the frontend
echo -e "${BLUE}Starting frontend...${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Configure MetaMask:"
echo "   - Network: Anvil Local"
echo "   - RPC: http://127.0.0.1:8545"
echo "   - Chain ID: 31337"
echo ""
echo "2. Import an Anvil account to MetaMask"
echo "   - Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Starting development server..."
echo ""

npm run dev
