import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AlertCircle, Wallet, TrendingUp, Users, Clock, Trophy, DollarSign, Gift, Loader2 } from 'lucide-react';

const LOTTERY_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

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

const NoLossLotteryDApp = () => {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setIsConnected(true);
      } catch (error) {
        alert(`Connection failed: ${error.message}`);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-600/10 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Header />

        {!isConnected ? (
          <ConnectWalletCard onConnect={connectWallet} />
        ) : (
          <Dashboard account={account} />
        )}

        <HowItWorks />
      </div>
    </div>
  );
};

const Header = () => (
  <header className="text-center mb-12 sm:mb-16">
    <div className="inline-flex items-center justify-center gap-4 mb-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <Trophy className="relative text-yellow-400 drop-shadow-2xl" size={56} />
      </div>
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-50 to-slate-200">
        No Loss Lottery
      </h1>
    </div>
    <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
      Deposit tokens, earn yield, win prizes — your principal is always safe
    </p>
    <div className="mt-6 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-2 text-sm text-emerald-300">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
      100% Principal Protected
    </div>
  </header>
);

const ConnectWalletCard = ({ onConnect }) => (
  <div className="max-w-md mx-auto">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition duration-500"></div>
      <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl mb-4 border border-blue-500/30">
            <Wallet className="text-blue-400" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Get Started</h3>
          <p className="text-slate-400 text-sm">Connect your wallet to participate in the lottery</p>
        </div>
        <button
          onClick={onConnect}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Wallet size={24} />
          Connect Wallet
        </button>
      </div>
    </div>
  </div>
);

const Dashboard = ({ account }) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [stats, setStats] = useState({
    userBalance: '0',
    playerCount: '0',
    currentPrize: '0',
    timeRemaining: '0',
    lastWinner: '',
    lastWinningAmount: '0',
    tokenBalance: '0',
  });
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState({
    mint: false,
    deposit: false,
    withdraw: false,
    pickWinner: false,
  });

  const loadContractData = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, provider);
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

      const [balance, count, prize, time, winner, winAmount, ownerAddr, tokenBal] = await Promise.all([
        lotteryContract.getUserBalance(account),
        lotteryContract.getPlayerCount(),
        lotteryContract.calculatePrize(),
        lotteryContract.getTimeRemaining(),
        lotteryContract.lastWinner(),
        lotteryContract.lastWinningAmount(),
        lotteryContract.owner(),
        tokenContract.balanceOf(account),
      ]);

      setStats({
        userBalance: ethers.formatUnits(balance, 18),
        playerCount: count.toString(),
        currentPrize: ethers.formatUnits(prize, 18),
        timeRemaining: time.toString(),
        lastWinner: winner,
        lastWinningAmount: ethers.formatUnits(winAmount, 18),
        tokenBalance: ethers.formatUnits(tokenBal, 18),
      });
      setIsOwner(ownerAddr.toLowerCase() === account.toLowerCase());
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
  };

  const mintTokens = async () => {
    setLoading(prev => ({ ...prev, mint: true }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const tx = await tokenContract.mint(account, ethers.parseUnits('1000', 18));
      await tx.wait();
      await loadContractData();
      alert('Successfully minted 1000 tokens!');
    } catch (error) {
      alert(`Mint failed: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, mint: false }));
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setLoading(prev => ({ ...prev, deposit: true }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, signer);
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const amount = ethers.parseUnits(depositAmount, 18);
      
      const approveTx = await tokenContract.approve(LOTTERY_ADDRESS, amount);
      await approveTx.wait();
      
      const depositTx = await lotteryContract.deposit(amount);
      await depositTx.wait();
      setDepositAmount('');
      await loadContractData();
      alert('Deposit successful!');
    } catch (error) {
      alert(`Deposit failed: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, deposit: false }));
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setLoading(prev => ({ ...prev, withdraw: true }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, signer);
      const amount = ethers.parseUnits(withdrawAmount, 18);
      const tx = await lotteryContract.withdraw(amount);
      await tx.wait();
      setWithdrawAmount('');
      await loadContractData();
      alert('Withdrawal successful!');
    } catch (error) {
      alert(`Withdrawal failed: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, withdraw: false }));
    }
  };
  
  const handlePickWinner = async () => {
    setLoading(prev => ({ ...prev, pickWinner: true }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lotteryContract = new ethers.Contract(LOTTERY_ADDRESS, LOTTERY_ABI, signer);
      const tx = await lotteryContract.pickWinner();
      await tx.wait();
      alert('Winner selected! Interest has been accrued and transferred.');
      setTimeout(loadContractData, 2000);
    } catch (error) {
      alert(`Failed to pick winner: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, pickWinner: false }));
    }
  };

  useEffect(() => {
    loadContractData();
    const interval = setInterval(loadContractData, 15000);
    return () => clearInterval(interval);
  }, [account]);

  const formatTime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const formatAddress = (addr) => {
    if (!addr || addr === ethers.ZeroAddress) return 'None';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  return (
    <>
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-6 sm:p-8 mb-8 border border-slate-700/50 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
              <Wallet className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Connected Account</p>
              <p className="text-white font-mono text-base sm:text-lg font-semibold">{formatAddress(account)}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center sm:text-right">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">USDC Balance</p>
              <p className="text-white font-bold text-2xl sm:text-3xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {parseFloat(stats.tokenBalance).toFixed(2)}
              </p>
            </div>
            <button
              onClick={mintTokens}
              disabled={loading.mint}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              {loading.mint ? <Loader2 className="animate-spin" size={18} /> : <Gift size={18} />}
              Mint 1000
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<DollarSign size={24} />} title="Your Deposit" value={`${parseFloat(stats.userBalance).toFixed(2)} USDC`} />
        <StatCard icon={<Users size={24} />} title="Total Players" value={stats.playerCount} />
        <StatCard icon={<TrendingUp size={24} />} title="Current Prize" value={`${parseFloat(stats.currentPrize).toFixed(4)} USDC`} />
        <StatCard icon={<Clock size={24} />} title="Time Remaining" value={formatTime(parseInt(stats.timeRemaining))} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ActionCard title="Deposit Tokens" buttonText="Deposit & Join" amount={depositAmount} setAmount={setDepositAmount} action={handleDeposit} color="green" isLoading={loading.deposit} />
        <ActionCard title="Withdraw Tokens" buttonText="Withdraw Principal" amount={withdrawAmount} setAmount={setWithdrawAmount} action={handleWithdraw} color="red" isLoading={loading.withdraw} />
      </div>
      
      {stats.lastWinner && stats.lastWinner !== ethers.ZeroAddress && (
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-3xl blur-lg opacity-40 group-hover:opacity-60 transition duration-500 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl rounded-3xl p-8 border border-yellow-500/30 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="text-yellow-400" size={32} />
                <h3 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-100">
                  Latest Winner
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 rounded-2xl p-4 border border-yellow-500/20">
                  <p className="text-amber-300 text-xs uppercase tracking-wider font-medium mb-2">Winner Address</p>
                  <p className="font-mono text-white text-lg font-semibold">{formatAddress(stats.lastWinner)}</p>
                </div>
                <div className="bg-slate-900/40 rounded-2xl p-4 border border-yellow-500/20">
                  <p className="text-amber-300 text-xs uppercase tracking-wider font-medium mb-2">Prize Amount</p>
                  <p className="font-bold text-2xl bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">
                    {parseFloat(stats.lastWinningAmount).toFixed(4)} USDC
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/30 to-orange-500/30 rounded-3xl blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-xl rounded-3xl p-6 border border-red-500/30 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-400" />
                Owner Controls
              </h3>
              <button
                onClick={handlePickWinner}
                disabled={loading.pickWinner}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-700 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 disabled:shadow-none disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {loading.pickWinner && <Loader2 className="animate-spin" size={20} />}
                <Trophy size={20} />
                Pick Winner
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StatCard = ({ icon, title, value }) => (
  <div className="group relative">
    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
    <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl group-hover:border-slate-600/50 transition-all duration-300">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-2">{title}</p>
        <p className="text-white text-2xl sm:text-3xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

const ActionCard = ({ title, buttonText, amount, setAmount, action, color, isLoading }) => {
  const colorConfig = {
    green: {
      gradient: "from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500",
      shadow: "shadow-emerald-500/30 hover:shadow-emerald-500/50",
      icon: <TrendingUp size={20} />,
      border: "border-emerald-500/30 focus:border-emerald-500/60"
    },
    red: {
      gradient: "from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500",
      shadow: "shadow-orange-500/30 hover:shadow-orange-500/50",
      icon: <DollarSign size={20} />,
      border: "border-orange-500/30 focus:border-orange-500/60"
    },
  };

  const config = colorConfig[color];

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-600/20 to-slate-700/20 rounded-3xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-xl group-hover:border-slate-600/50 transition-all duration-300">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          {config.icon}
          {title}
        </h2>
        <div className="mb-6">
          <label className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-2 block">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`w-full bg-slate-950/50 text-white placeholder-slate-500 rounded-xl px-5 py-4 text-lg font-semibold outline-none border ${config.border} transition-all duration-300 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900`}
          />
        </div>
        <button
          onClick={action}
          disabled={isLoading}
          className={`w-full bg-gradient-to-r ${config.gradient} disabled:from-slate-600 disabled:to-slate-700 text-white py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${config.shadow} disabled:shadow-none disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]`}
        >
          {isLoading && <Loader2 className="animate-spin" size={20} />}
          {buttonText}
        </button>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const steps = [
    { number: "01", title: "Connect & Fund", description: "Connect your wallet and mint test tokens to get started with the lottery.", icon: <Wallet size={24} /> },
    { number: "02", title: "Deposit Tokens", description: "Deposit your tokens to join the lottery. Funds are supplied to DeFi protocols to earn yield.", icon: <DollarSign size={24} /> },
    { number: "03", title: "Earn Interest", description: "Your deposit generates yield in the background while you wait for the lottery to conclude.", icon: <TrendingUp size={24} /> },
    { number: "04", title: "Winner Selected", description: "A winner is randomly selected using Chainlink VRF. They receive all accumulated interest!", icon: <Trophy size={24} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto mt-16">
      <div className="text-center mb-12">
        <h3 className="text-3xl sm:text-4xl font-bold text-white mb-3">How It Works</h3>
        <p className="text-slate-400 text-lg">Simple, transparent, and fair — your principal is always protected</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {steps.map((step, index) => (
          <div key={index} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-cyan-400 text-xs font-mono font-semibold mb-1">{step.number}</div>
                  <h4 className="text-white font-bold text-lg mb-2">{step.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-white font-semibold mb-1">Risk-Free Participation</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              You can withdraw your principal deposit at any time. Only the generated interest is used as the prize pool, ensuring your original deposit is always safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoLossLotteryDApp;