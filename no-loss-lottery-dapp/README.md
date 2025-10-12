# No Loss Lottery DApp - Frontend README

A modern, responsive React frontend for the No Loss Lottery DeFi application. This DApp allows users to participate in a risk-free lottery where their principal is protected while earning yield through Aave protocol.

## 🚀 Features

- **Modern UI/UX**: Built with React, Tailwind CSS, and Framer Motion for smooth animations
- **MetaMask Integration**: Seamless wallet connection and transaction management
- **Real-time Updates**: Live polling of blockchain data every 15 seconds
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Toast Notifications**: User-friendly feedback for all transactions
- **Owner Controls**: Special interface for lottery administrators

## 🛠 Tech Stack

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library for smooth transitions
- **Ethers.js v6**: Ethereum library for blockchain interactions
- **React Hot Toast**: Beautiful notification system
- **Lucide React**: Modern icon library

## 📋 Prerequisites

Before running this frontend application, make sure you have:

1. **Node.js** (v16 or higher)
2. **npm** or **yarn** package manager
3. **MetaMask** browser extension installed
4. **Backend contracts** deployed (see backend README)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Navigate to the frontend directory
cd no-loss-lottery-dapp

# Install dependencies
npm install
# or
yarn install
```

### 2. Configure Contract Addresses

Update the contract addresses in `src/NoLossLotteryDApp.jsx`:

```javascript
// Replace with your deployed contract addresses
const LOTTERY_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
```

### 3. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## 🔗 MetaMask Setup Guide

### Step 1: Install MetaMask

1. Visit [MetaMask.io](https://metamask.io/)
2. Click "Download" and install the browser extension
3. Create a new wallet or import an existing one
4. Secure your seed phrase in a safe location

### Step 2: Connect to Local Network

For development, you'll need to connect MetaMask to your local Hardhat network:

1. Open MetaMask and click on the network dropdown
2. Select "Add Network" → "Add a network manually"
3. Enter the following details:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

### Step 3: Import Test Account

1. In MetaMask, click the account icon → "Import Account"
2. Use the private key from your Hardhat deployment (found in deployment logs)
3. This account should have ETH for gas fees and test tokens

### Step 4: Connect to DApp

1. Open the No Loss Lottery DApp in your browser
2. Click "Connect Wallet" button
3. MetaMask will prompt you to connect - click "Connect"
4. Your wallet address will appear in the header

## 📱 How to Use the DApp

### 1. Connect Wallet
- Click the "Connect Wallet" button on the homepage
- Approve the MetaMask connection request
- Your connected address will be displayed

### 2. Mint Test Tokens
- Click "Mint 1000" to receive 1000 USDC test tokens
- This is for testing purposes only

### 3. Deposit Tokens
- Enter the amount of USDC you want to deposit
- Click "Deposit & Join"
- Approve the token spending in MetaMask
- Confirm the deposit transaction
- Your tokens will be supplied to Aave and you'll join the lottery

### 4. Monitor Your Position
- View your current deposit balance
- Check the total number of players
- See the current prize pool (yield generated)
- Monitor time remaining in the current lottery round

### 5. Withdraw (Optional)
- Enter the amount you want to withdraw
- Click "Withdraw Principal"
- Confirm the transaction
- Your principal will be returned (you can withdraw anytime)

### 6. Owner Functions (If Applicable)
- If you're the contract owner, you'll see additional controls
- Click "Pick Winner" after the lottery duration expires
- This triggers Chainlink VRF to select a random winner

## 🎨 UI Components

### Main Components

- **Header**: App title with animated trophy icon
- **ConnectWallet**: Wallet connection interface
- **Dashboard**: Main user interface with all functionality
- **StatCard**: Display key metrics (balance, players, prize, time)
- **ActionCard**: Deposit/withdraw interface
- **HowItWorks**: Educational section explaining the lottery

### Key Features

- **Responsive Grid Layout**: Adapts to different screen sizes
- **Gradient Backgrounds**: Modern glassmorphism design
- **Loading States**: Visual feedback during transactions
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback
- **Animated Transitions**: Smooth page transitions with Framer Motion

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for environment-specific settings:

```env
VITE_RPC_URL=http://localhost:8545
VITE_LOTTERY_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
VITE_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Build Configuration

The app uses Vite for building. Key configuration files:

- `vite.config.ts`: Vite configuration
- `tailwind.config.js`: Tailwind CSS customization
- `tsconfig.json`: TypeScript configuration

## 🚀 Production Build

```bash
# Build for production
npm run build
# or
yarn build

# Preview production build
npm run preview
# or
yarn preview
```

## 🐛 Troubleshooting

### Common Issues

1. **MetaMask Connection Failed**
   - Ensure MetaMask is installed and unlocked
   - Check that you're on the correct network
   - Try refreshing the page and reconnecting

2. **Transaction Failed**
   - Check you have sufficient ETH for gas fees
   - Ensure you have enough token balance
   - Verify contract addresses are correct

3. **Contract Not Found**
   - Make sure the backend is running
   - Verify contract addresses match deployed contracts
   - Check that contracts are deployed to the correct network

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### Development Tips

- Use browser developer tools to inspect network requests
- Check MetaMask transaction history for failed transactions
- Monitor browser console for JavaScript errors
- Use Hardhat console logs for contract debugging

## 📚 Additional Resources

- [MetaMask Documentation](https://docs.metamask.io/)
- [Ethers.js Documentation](https://docs.ethers.io/)
- [React Documentation](https://reactjs.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
