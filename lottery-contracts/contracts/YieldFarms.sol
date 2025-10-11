// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract YieldFarm {
    IERC20 public immutable depositToken;
    uint256 public totalPrincipal;
    uint256 public yieldRate = 10; // 10% annual yield rate
    uint256 public startTime;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _depositToken) {
        depositToken = IERC20(_depositToken);
        owner = msg.sender;
        startTime = block.timestamp;
    }

    function deposit(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        totalPrincipal += _amount;
        require(
            depositToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
    }

    function withdraw(uint256 _amount) external {
        require(totalPrincipal >= _amount, "Insufficient principal");
        totalPrincipal -= _amount;
        require(
            depositToken.transfer(msg.sender, _amount),
            "Transfer failed"
        );
    }

    function calculateYield() public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - startTime;
        uint256 yield = (totalPrincipal * yieldRate * timeElapsed) / (100 * 365 days);
        return yield;
    }

    function claimYield() external onlyOwner returns (uint256) {
        uint256 yield = calculateYield();
        if (yield > 0) {
            startTime = block.timestamp; // Reset start time after claiming
            require(
                depositToken.transfer(owner, yield),
                "Yield transfer failed"
            );
        }
        return yield;
    }

    function setOwner(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}