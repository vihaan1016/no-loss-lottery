# No Loss Lottery - Backend (Smart Contracts) README

A decentralized lottery system that allows users to deposit tokens, earn yield through DeFi protocols, and participate in a risk-free lottery where only the generated interest is used as prizes.

## 🏗️ Project Overview

This backend consists of Solidity smart contracts that implement a no-loss lottery system. Users deposit tokens (USDC), which are then supplied to Mock Aave Protocol to earn yield. The generated interest becomes the prize pool, while the original principal remains safe and withdrawable at any time.

This project is written to interact with the real Chainlink VRF V2 service. However, because we are running it in a Hardhat environment, we are using a pseudo or mock version of the Chainlink VRF for local testing and development.

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Basic understanding of Solidity and Ethereum

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd lottery-contracts

# Install dependencies
npm install
```

### 2. Local Development Setup

```bash
# Start local Hardhat network
npx hardhat node

# In a new terminal, deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Testing

```bash
# Run all tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/NoLossLottery.js
```

## 📁 Contract Architecture

### Core Contracts

#### 1. **NoLossLottery.sol** - Main Lottery Contract
The primary contract that manages the entire lottery system.

**Key Features:**
- **Deposit Management**: Users can deposit USDC tokens
- **Aave Integration**: Automatically supplies deposited tokens to Mock Aave Protocol
- **Prize Calculation**: Calculates yield earned from Aave deposits
- **Winner Selection**: Uses Mock Chainlink VRF for provably fair random selection
- **Principal Protection**: Users can withdraw their original deposits anytime

**Main Functions:**
- `deposit(uint256 _amount)`: Deposit tokens and join the lottery
- `withdraw(uint256 _amount)`: Withdraw deposited tokens
- `pickWinner()`: Owner function to trigger winner selection
- `calculatePrize()`: Calculate the current prize pool (yield earned)
- `getUserBalance(address _user)`: Get user's deposited balance
- `getPlayerCount()`: Get total number of players
- `getTimeRemaining()`: Get time remaining in current lottery round

#### 2. **MockERC20.sol** - Mock USDC Token
A simple ERC20 token for testing purposes.

**Functions:**
- `mint(address to, uint256 amount)`: Mint tokens for testing
- Standard ERC20 functions (transfer, approve, balanceOf, etc.)

#### 3. **MockAavePool.sol** - Mock Aave Pool
Simulates Aave Protocol's lending pool functionality.

**Functions:**
- `supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)`: Supply tokens to earn yield
- `withdraw(address asset, uint256 amount, address to)`: Withdraw supplied tokens

#### 4. **MockAToken.sol** - Mock Aave Interest-Bearing Token
Simulates Aave's interest-bearing tokens (aTokens).

**Functions:**
- `balanceOf(address account)`: Get balance including earned interest
- `mint(address to, uint256 amount)`: Mint aTokens (simulating yield)

#### 5. **MockVRFCoordinator.sol** - Mock Chainlink VRF
Simulates Chainlink's Verifiable Random Function for testing.

**Functions:**
- `createSubscription()`: Create a VRF subscription
- `requestRandomWords()`: Request random numbers
- `fulfillRandomWords()`: Provide random numbers to requesting contract

## 🔧 Configuration

### Hardhat Configuration
The project uses a simple Hardhat configuration:

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
};
```

### Environment Setup
For production deployment, create a `.env` file:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=your_rpc_url_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 🚀 Deployment

### Local Development Deployment

```bash
# Start local network
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Deployment Script Explanation

The `deploy.js` script performs the following steps:

1. **Deploy Mock USDC**: Creates a test ERC20 token
2. **Deploy Mock aToken**: Creates interest-bearing token
3. **Deploy Mock Aave Pool**: Creates lending pool simulation
4. **Deploy Mock VRF Coordinator**: Creates randomness provider
5. **Create VRF Subscription**: Sets up Chainlink VRF subscription
6. **Deploy NoLossLottery**: Deploys main contract with all dependencies
7. **Setup Test Environment**: Transfers initial tokens for testing

## 🧪 Testing

### Test Coverage

The test suite covers:

- **Contract Deployment**: Verifies proper initialization
- **Deposit Functionality**: Tests token deposits and player registration
- **Withdrawal Functionality**: Tests principal withdrawal
- **Winner Selection**: Tests VRF-based random selection
- **Prize Distribution**: Tests yield distribution to winners
- **Access Control**: Tests owner-only functions
- **Edge Cases**: Tests error conditions and boundary cases

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/NoLossLottery.js

# Run with coverage
npx hardhat coverage
```

## 📊 Contract Interactions

### User Flow

1. **User deposits USDC** → Tokens transferred to lottery contract
2. **Contract approves Aave** → Grants spending permission
3. **Contract supplies to Aave** → Tokens start earning yield
4. **Yield accumulates** → Interest builds up over time
5. **Owner picks winner** → Triggers VRF request
6. **Winner receives yield** → Only interest is distributed as prize

### Security Features

- **Principal Protection**: Users can always withdraw original deposits
- **Yield-Only Prizes**: Only earned interest is used for prizes
- **VRF Randomness**: Provably fair winner selection
- **Access Control**: Owner-only functions for lottery management
- **Input Validation**: All functions validate inputs and states

## 🔍 Key Design Decisions

### Why Mock Contracts?

This project uses mock contracts for:
- **Development Speed**: Faster iteration without external dependencies
- **Testing Reliability**: Predictable behavior for comprehensive testing
- **Cost Efficiency**: No need for testnet tokens or subscriptions
- **Educational Purpose**: Clear understanding of integration points

### Lottery Duration

- **7 Days**: Balances yield generation with user engagement
- **Configurable**: Duration can be modified in contract
- **Fair Timing**: Gives all participants equal opportunity

### Yield Strategy

- **Aave Integration**: Uses established DeFi protocol
- **Compound Interest**: Yield compounds over time
- **Risk Management**: Only uses interest for prizes, not principal

## 🛠️ Development Commands

```bash
# Compile contracts
npx hardhat compile

# Clean build artifacts
npx hardhat clean

# Run linter
npx hardhat lint

# Generate TypeChain types
npx hardhat typechain

# Gas optimization
npx hardhat test --gas-report
```

## 📝 Important Notes

### Current Limitations

1. **Mock Contracts**: Uses mock implementations for testing
2. **No Real VRF**: Uses simulated randomness
3. **No Real Aave**: Uses mock lending pool
4. **Testnet Only**: Designed for development/testing

### Production Considerations

For production deployment, you would need:
- Real Chainlink VRF subscription
- Actual Aave Protocol integration
- Proper token addresses for target network
- Security audits and testing
- Gas optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Compilation Errors:**
```bash
npx hardhat clean
npm install
npx hardhat compile
```

**Test Failures:**
```bash
# Ensure local network is running
npx hardhat node

# Run tests in new terminal
npx hardhat test
```

**Deployment Issues:**
- Check network configuration
- Verify account has sufficient funds
- Ensure all dependencies are installed

### Getting Help

- Check the test files for usage examples
- Review contract comments for function explanations
- Open an issue for bugs or questions

---

**Note**: This is a development/testing version using mock contracts. For production use, integrate with real Chainlink VRF, Aave Protocol, and deploy on appropriate networks.
