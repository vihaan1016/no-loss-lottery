import React, { useState, useEffect } from 'react';
import { AlertCircle, Wallet, TrendingUp, Users, Clock, Trophy, DollarSign } from 'lucide-react';
import { ethers } from 'ethers';

const NoLossLotteryUI = () => {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [userBalance, setUserBalance] = useState('0');
  const [playerCount, setPlayerCount] = useState('0');
  const [currentPrize, setCurrentPrize] = useState('0');
  const [timeRemaining, setTimeRemaining] = useState('0');
  const [lastWinner, setLastWinner] = useState('');
  const [lastWinningAmount, setLastWinningAmount] = useState('0');
  const [isOwner, setIsOwner] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');

  // Contract addresses (you'll need to update these after deployment)
  const LOTTERY_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  const TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  // ABIs (simplified - add only the functions you need)
  const LOTTERY_ABI = [
    "function deposit(uint256 _amount) external",
    "function withdraw(uint256 _amount) external",
    "function getUserBalance(address _user) external view returns (uint256)",
    "function getPlayerCount() external view returns (uint256)",
    "function calculatePrize() external view returns (uint256)",
    "function getTimeRemaining() external view returns (uint256)",
    "function lastWinner() external view returns (address)",
    "function lastWinningAmount() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function pickWinner() external"
  ];

  const TOKEN_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function mint(address to, uint256 amount) external"
  ];

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        setIsConnected(true);
        setTxStatus('Wallet connected successfully!');
        await loadContractData(accounts[0]);
      } catch (error) {
        setTxStatus('Failed to connect wallet: ' + error.message);
      }
    } else {
      setTxStatus('Please install MetaMask!');
    }
  };

  const loadContractData = async (userAccount) => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, provider);
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

        const balance = await lotteryContract.getUserBalance(userAccount);
        setUserBalance(ethers.formatUnits(balance, 18));

        const count = await lotteryContract.getPlayerCount();
        setPlayerCount(count.toString());

        const prize = await lotteryContract.calculatePrize();
        setCurrentPrize(ethers.formatUnits(prize, 18));

        const time = await lotteryContract.getTimeRemaining();
        setTimeRemaining(time.toString());

        const winner = await lotteryContract.lastWinner();
        setLastWinner(winner);

        const winAmount = await lotteryContract.lastWinningAmount();
        setLastWinningAmount(ethers.formatUnits(winAmount, 18));

        const ownerAddr = await lotteryContract.owner();
        setIsOwner(ownerAddr.toLowerCase() === userAccount.toLowerCase());

        const tokenBal = await tokenContract.balanceOf(userAccount);
        setTokenBalance(ethers.formatUnits(tokenBal, 18));
      } catch (error) {
        console.error('Error loading contract data:', error);
      }
    }
  };

  const mintTokens = async () => {
    if (!isConnected) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      setTxStatus('Minting 1000 tokens...');
      const tx = await tokenContract.mint(account, ethers.parseUnits('1000', 18));
      await tx.wait();
      setTxStatus('Tokens minted successfully!');
      await loadContractData(account);
    } catch (error) {
      setTxStatus('Error: ' + error.message);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setTxStatus('Please enter a valid amount');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, signer);
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

      const amount = ethers.parseUnits(depositAmount, 18);

      setTxStatus('Approving tokens...');
      const approveTx = await tokenContract.approve(LOTTERY_ADDRESS, amount);
      await approveTx.wait();

      setTxStatus('Depositing tokens...');
      const depositTx = await lotteryContract.deposit(amount);
      await depositTx.wait();

      setTxStatus('Deposit successful!');
      setDepositAmount('');
      await loadContractData(account);
    } catch (error) {
      setTxStatus('Error: ' + error.message);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setTxStatus('Please enter a valid amount');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, signer);

      const amount = ethers.parseUnits(withdrawAmount, 18);

      setTxStatus('Withdrawing tokens...');
      const tx = await lotteryContract.withdraw(amount);
      await tx.wait();

      setTxStatus('Withdrawal successful!');
      setWithdrawAmount('');
      await loadContractData(account);
    } catch (error) {
      setTxStatus('Error: ' + error.message);
    }
  };

  const handlePickWinner = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, signer);

      setTxStatus('Requesting random winner...');
      const tx = await lotteryContract.pickWinner();
      await tx.wait();

      setTxStatus('Winner selection initiated! Check events for results.');
      setTimeout(() => loadContractData(account), 3000);
    } catch (error) {
      setTxStatus('Error: ' + error.message);
    }
  };

  const formatTime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const formatAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'None';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        loadContractData(account);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, account]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-400" size={48} />
            No Loss Lottery
          </h1>
          <p className="text-blue-200 text-lg">Deposit, Earn Yield, Win Prizes - Never Lose Your Principal!</p>
        </div>

        {/* Connect Wallet Button */}
        {!isConnected ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-6 text-center">
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all flex items-center gap-2 mx-auto"
            >
              <Wallet size={24} />
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Account Info */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-200 text-sm">Connected Account</p>
                  <p className="text-white font-mono text-lg">{formatAddress(account)}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-200 text-sm">Token Balance</p>
                  <p className="text-white font-bold text-xl">{parseFloat(tokenBalance).toFixed(2)} USDC</p>
                  <button
                    onClick={mintTokens}
                    className="mt-2 bg-green-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-green-600"
                  >
                    Mint 1000 Tokens
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-green-400" size={24} />
                  <p className="text-blue-200 text-sm">Your Deposit</p>
                </div>
                <p className="text-white text-2xl font-bold">{parseFloat(userBalance).toFixed(2)}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-purple-400" size={24} />
                  <p className="text-blue-200 text-sm">Total Players</p>
                </div>
                <p className="text-white text-2xl font-bold">{playerCount}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-yellow-400" size={24} />
                  <p className="text-blue-200 text-sm">Current Prize</p>
                </div>
                <p className="text-white text-2xl font-bold">{parseFloat(currentPrize).toFixed(4)}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="text-blue-400" size={24} />
                  <p className="text-blue-200 text-sm">Time Remaining</p>
                </div>
                <p className="text-white text-xl font-bold">{formatTime(parseInt(timeRemaining))}</p>
              </div>
            </div>

            {/* Main Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Deposit Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Deposit Tokens</h2>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount to deposit"
                  className="w-full bg-white/20 text-white placeholder-blue-200 rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={handleDeposit}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  Deposit & Join Lottery
                </button>
              </div>

              {/* Withdraw Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Withdraw Tokens</h2>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount to withdraw"
                  className="w-full bg-white/20 text-white placeholder-blue-200 rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={handleWithdraw}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
                >
                  Withdraw Principal
                </button>
              </div>
            </div>

            {/* Last Winner */}
            {lastWinner && lastWinner !== '0x0000000000000000000000000000000000000000' && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-6 mb-6 border-2 border-yellow-400/50">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="text-yellow-400" size={32} />
                  <h3 className="text-2xl font-bold text-white">Last Winner</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-200 text-sm">Winner Address</p>
                    <p className="text-white font-mono text-lg">{formatAddress(lastWinner)}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">Prize Amount</p>
                    <p className="text-yellow-400 font-bold text-xl">{parseFloat(lastWinningAmount).toFixed(4)} USDC</p>
                  </div>
                </div>
              </div>
            )}

            {/* Owner Controls */}
            {isOwner && (
              <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 mb-6 border-2 border-red-400/50">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <AlertCircle size={24} />
                  Owner Controls
                </h3>
                <button
                  onClick={handlePickWinner}
                  className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-pink-700 transition-all"
                >
                  Pick Winner (Chainlink VRF)
                </button>
                <p className="text-blue-200 text-sm mt-2">Only available after lottery duration (7 days)</p>
              </div>
            )}

            {/* Status Messages */}
            {txStatus && (
              <div className="bg-blue-500/20 backdrop-blur-md rounded-xl p-4 border border-blue-400/50">
                <p className="text-white">{txStatus}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-6xl mx-auto mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-3">How It Works</h3>
        <ol className="text-blue-200 space-y-2">
          <li>1. Connect your wallet and mint test tokens</li>
          <li>2. Deposit tokens to join the lottery (they're supplied to Aave to earn yield)</li>
          <li>3. Wait for the lottery duration (7 days)</li>
          <li>4. Owner picks a winner using Chainlink VRF for true randomness</li>
          <li>5. Winner receives all the interest earned - everyone keeps their principal!</li>
          <li>6. Withdraw your principal anytime</li>
        </ol>
      </div>
    </div>
  );
};

export default NoLossLotteryUI;