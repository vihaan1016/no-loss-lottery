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
}

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
}


contract NoLossLottery is VRFConsumerBaseV2 {

    IERC20 public immutable depositToken; // e.g., USDC address
    IPool public immutable aavePool; // Aave Pool address
    address public aTokenAddress; // The address of the corresponding aToken
    address[] public players; // List of players in the lottery
    uint256 public lotteryDuration = 7 days; // Duration of each lottery round
    uint256 public lotteryStartTime; // Start time of the current lottery round
    address public lastWinner; //  Last winner of the lottery
    uint256 public lastWinningAmount; // Amount won in the last lottery
    mapping(address => bool) public isPlayer;
    mapping(address => uint256) public userDeposits; // Mapping to track individual user deposits
    uint256 public totalPrincipal;

    // Chainlink VRF Variables
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

    
    // Constructor is used to initialize the contract with token, Aave pool addresses, and VRF configuration
    // _depositToken: Address of the ERC20 token to be deposited
    // _aavePool: Address of the Aave V3 Pool contract
    // _aTokenAddress: Address of the corresponding aToken
    // _vrfCoordinatorV2: Address of the Chainlink VRF Coordinator
    // _keyHash: Gas lane key hash for VRF
    // _subscriptionId: Chainlink VRF subscription ID
    // _callbackGasLimit: Gas limit for the fulfillRandomWords callback
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
    

    // Deposit function allows users to deposit tokens into the contract and then supplies them to Aave
    // _amount: Amount of tokens to deposit
    // User must approve this contract to spend their tokens before calling this function
    function deposit(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user to this contract
        require(
            depositToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        // Approve Aave Pool to spend the tokens
        require(
            depositToken.approve(address(aavePool), _amount),
            "Approval failed"
        );
        
        // Supply tokens to Aave
        aavePool.supply(address(depositToken), _amount, address(this), 0);
        
        // Mark as player if first deposit
        if (!isPlayer[msg.sender]) {
            isPlayer[msg.sender] = true;
            players.push(msg.sender);
        }
        
        // Track user's deposit
        userDeposits[msg.sender] += _amount;
        totalPrincipal += _amount;
        
        emit Deposited(msg.sender, _amount);
    }

    // Withdraw function allows users to withdraw their deposited tokens from Aave back to their wallet
    // _amount: Amount of tokens to withdraw
    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(userDeposits[msg.sender] >= _amount, "Insufficient balance");
        
        // Withdraw from Aave to this contract
        uint256 withdrawn = aavePool.withdraw(address(depositToken), _amount, address(this));
        
        // Transfer tokens back to user
        require(
            depositToken.transfer(msg.sender, withdrawn),
            "Transfer failed"
        );
        
        // Update user's balance
        userDeposits[msg.sender] -= _amount;
        totalPrincipal -= _amount;
        
        emit Withdrawn(msg.sender, withdrawn);
    }

    // getUserBalance returns the deposited balance of a user
    // _user: Address of the user
    // Returns the amount deposited by the user
    function getUserBalance(address _user) external view returns (uint256) {
        return userDeposits[_user];
    }


    // Calculates the prize (yield earned) from Aave deposits
    // Prize is the difference between total Aave balance and total principal deposited
    // Returns the amount of yield earned
    function calculatePrize() public view returns (uint256 prize) {
        // Get the total balance held in Aave (principal + yield)
        uint256 totalAaveBalance = IAToken(aTokenAddress).balanceOf(address(this));
        
        // Calculate prize as the difference between Aave balance and total principal
        // If totalAaveBalance < totalPrincipal (shouldn't happen but safety check)
        if (totalAaveBalance > totalPrincipal) {
            prize = totalAaveBalance - totalPrincipal;
        } else {
            prize = 0;
        }
        
        return prize;
    }

    // Request a random winner using Chainlink VRF (Owner only)
    // This function kicks off the randomness request process
    // Can only be called after the lottery duration has passed
    function pickWinner() external onlyOwner {
        require(block.timestamp >= lotteryStartTime + lotteryDuration, "Lottery duration not yet passed");
        require(players.length > 0, "No players in the lottery");
        
        // Request random words from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        emit WinnerRequested(requestId);
    }

    // Callback function called by Chainlink VRF Coordinator with the random number
    // This function is called automatically by Chainlink after randomness is generated
    // requestId: The ID of the VRF request
    // randomWords: Array containing the random number(s) generated
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        require(players.length > 0, "No players in the lottery");
        
        // Select winner using the random number
        uint256 randomIndex = randomWords[0] % players.length;
        address winner = players[randomIndex];
        
        // Calculate the prize (interest earned)
        uint256 prize = calculatePrize();
        
        // Only proceed if there's a prize to distribute
        if (prize > 0) {
            // Withdraw only the prize amount from Aave
            aavePool.withdraw(address(depositToken), prize, address(this));
            
            // Transfer the prize to the winner
            require(
                depositToken.transfer(winner, prize),
                "Prize transfer failed"
            );
        }
        
        // Update state variables
        lastWinner = winner;
        lastWinningAmount = prize;
        lotteryStartTime = block.timestamp; // Reset for next lottery round
        
        emit WinnerPicked(winner, prize, requestId);
    }

    // Get the current list of players
    function getPlayers() external view returns (address[] memory) {
        return players;
    }

    // Get the number of players in the current lottery
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    // Check if the lottery has ended
    function hasLotteryEnded() external view returns (bool) {
        return block.timestamp >= lotteryStartTime + lotteryDuration;
    }

    // Get time remaining in the current lottery round
    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = lotteryStartTime + lotteryDuration;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
}