// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IAToken.sol"; // We need the MockAToken contract interface

contract MockAavePool {
    MockAToken public aToken;
    mapping(address => uint256) public suppliedAmounts;
    
    // Interest rate configuration
    uint256 public constant INTEREST_RATE = 500; // 5% APY in basis points (500 = 5%)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    uint256 public lastUpdateTimestamp;
    uint256 public totalSupplied;

    event InterestAccrued(address indexed beneficiary, uint256 amount, uint256 timeElapsed);

    constructor(address _aTokenAddress) {
        aToken = MockAToken(_aTokenAddress);
        lastUpdateTimestamp = block.timestamp;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {
        referralCode; // Silence unused parameter warning
        
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        suppliedAmounts[onBehalfOf] += amount;
        totalSupplied += amount;

        // Mint aTokens to the depositor to simulate Aave's behavior
        aToken.mint(onBehalfOf, amount);
    }
    
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(suppliedAmounts[msg.sender] >= amount, "Insufficient balance");
        
        suppliedAmounts[msg.sender] -= amount;
        totalSupplied -= amount;
        
        // A real implementation would burn aTokens here, but this is sufficient for our mock.
        IERC20(asset).transfer(to, amount);
        
        return amount;
    }
    
    /**
     * @notice Manually accrue interest to a specific beneficiary
     * @dev This simulates Aave's interest accrual mechanism for testing
     * @param beneficiary Address to receive the accrued interest (typically the lottery contract)
     */
    function accrueInterestTo(address beneficiary) external {
        uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
        
        // Only accrue if time has passed and there are deposits
        if (timeElapsed > 0 && totalSupplied > 0) {
            // Calculate interest using the formula: 
            // interest = principal × rate × time / (basis points × seconds per year)
            uint256 interest = (totalSupplied * INTEREST_RATE * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
            
            if (interest > 0) {
                // Mint aTokens representing the interest earned
                aToken.mint(beneficiary, interest);
                
                emit InterestAccrued(beneficiary, interest, timeElapsed);
            }
            
            // Update timestamp for next accrual
            lastUpdateTimestamp = block.timestamp;
        }
    }
    
    /**
     * @notice Get the current interest rate
     * @return Annual interest rate in basis points (e.g., 500 = 5%)
     */
    function getInterestRate() external pure returns (uint256) {
        return INTEREST_RATE;
    }
    
    /**
     * @notice Calculate pending interest that would be accrued
     * @dev Useful for preview before actually accruing
     * @return Pending interest amount
     */
    function getPendingInterest() external view returns (uint256) {
        uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
        
        if (timeElapsed == 0 || totalSupplied == 0) {
            return 0;
        }
        
        return (totalSupplied * INTEREST_RATE * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }
    
    /**
     * @notice Get the total amount currently supplied to the pool
     * @return Total supplied amount
     */
    function getTotalSupplied() external view returns (uint256) {
        return totalSupplied;
    }
    
    /**
     * @notice Get the time of last interest update
     * @return Timestamp of last update
     */
    function getLastUpdateTime() external view returns (uint256) {
        return lastUpdateTimestamp;
    }
}