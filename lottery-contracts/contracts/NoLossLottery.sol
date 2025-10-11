// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function accrueInterestTo(address beneficiary) external;
}

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
}


contract NoLossLottery is VRFConsumerBaseV2 {

    IERC20 public immutable depositToken;
    IPool public immutable aavePool;
    address public aTokenAddress;
    address[] public players;
    uint256 public lotteryDuration = 7 days;
    uint256 public lotteryStartTime;
    address public lastWinner;
    uint256 public lastWinningAmount;
    mapping(address => bool) public isPlayer;
    mapping(address => uint256) public userDeposits;
    uint256 public totalPrincipal;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event WinnerRequested(uint256 indexed requestId);
    event WinnerPicked(address indexed winner, uint256 prize, uint256 requestId);

    
    constructor(
        address _depositToken,
        address _aavePool,
        address _aTokenAddress,
        address _vrfCoordinatorV2,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        require(_depositToken != address(0), "Invalid deposit token address");
        require(_aavePool != address(0), "Invalid Aave pool address");
        require(_aTokenAddress != address(0), "Invalid aToken address");
        require(_vrfCoordinatorV2 != address(0), "Invalid VRF Coordinator address");
        
        depositToken = IERC20(_depositToken);
        aavePool = IPool(_aavePool);
        aTokenAddress = _aTokenAddress;
        
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_keyHash = _keyHash;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        
        owner = msg.sender;
        lotteryStartTime = block.timestamp;
    }
    

    function deposit(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        require(
            depositToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        require(
            depositToken.approve(address(aavePool), _amount),
            "Approval failed"
        );
        
        aavePool.supply(address(depositToken), _amount, address(this), 0);
        
        if (!isPlayer[msg.sender]) {
            isPlayer[msg.sender] = true;
            players.push(msg.sender);
        }
        
        userDeposits[msg.sender] += _amount;
        totalPrincipal += _amount;
        
        emit Deposited(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(userDeposits[msg.sender] >= _amount, "Insufficient balance");
        
        uint256 withdrawn = aavePool.withdraw(address(depositToken), _amount, address(this));
        
        require(
            depositToken.transfer(msg.sender, withdrawn),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] -= _amount;
        totalPrincipal -= _amount;
        
        emit Withdrawn(msg.sender, withdrawn);
    }

    function getUserBalance(address _user) external view returns (uint256) {
        return userDeposits[_user];
    }


    function calculatePrize() public view returns (uint256 prize) {
        uint256 totalAaveBalance = IAToken(aTokenAddress).balanceOf(address(this));
        
        if (totalAaveBalance > totalPrincipal) {
            prize = totalAaveBalance - totalPrincipal;
        } else {
            prize = 0;
        }
        
        return prize;
    }

    function pickWinner() external onlyOwner {
        require(players.length > 0, "No players in the lottery");
        
        // Accrue interest before picking winner
        IPool(aavePool).accrueInterestTo(address(this));
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        emit WinnerRequested(requestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        require(players.length > 0, "No players in the lottery");
        
        uint256 randomIndex = randomWords[0] % players.length;
        address winner = players[randomIndex];
        
        uint256 prize = calculatePrize();
        
        if (prize > 0) {
            aavePool.withdraw(address(depositToken), prize, address(this));
            
            require(
                depositToken.transfer(winner, prize),
                "Prize transfer failed"
            );
        }
        
        lastWinner = winner;
        lastWinningAmount = prize;
        lotteryStartTime = block.timestamp;
        
        emit WinnerPicked(winner, prize, requestId);
    }

    function getPlayers() external view returns (address[] memory) {
        return players;
    }

    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    function hasLotteryEnded() external view returns (bool) {
        return block.timestamp >= lotteryStartTime + lotteryDuration;
    }

    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = lotteryStartTime + lotteryDuration;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
}