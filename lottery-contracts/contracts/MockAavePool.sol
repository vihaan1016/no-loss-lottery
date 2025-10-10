// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IAToken.sol"; // We need the MockAToken contract interface

contract MockAavePool {
    MockAToken public aToken;
    mapping(address => uint256) public suppliedAmounts;

    constructor(address _aTokenAddress) {
        aToken = MockAToken(_aTokenAddress);
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {
        referralCode; 
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        suppliedAmounts[onBehalfOf] += amount;

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
        // A real implementation would burn aTokens here, but this is sufficient for our mock.
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}