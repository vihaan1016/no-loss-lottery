// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title MockVRFCoordinator
 * @dev Mock implementation of Chainlink VRF Coordinator for local testing
 */
contract MockVRFCoordinator is VRFCoordinatorV2Interface {
    // Mock constants
    uint16 public constant MAX_CONSUMERS = 100;
    uint16 public constant MAX_NUM_WORDS = 500;
    uint32 public constant MAX_REQUEST_CONFIRMATIONS = 200;
    uint32 public constant MAX_GAS_LIMIT = 2500000;
    uint256 public constant MAX_REQUEST_VALUE = 1000000000000000000; // 1 LINK
    
    // Storage
    mapping(uint256 => address) public subscriptionOwners;
    mapping(uint256 => address[]) public subscriptionConsumers;
    mapping(uint256 => uint256) public requestCounts;
    
    event RequestRandomWords(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        bytes indexed extraArgs
    );
    
    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256 outputSeed,
        uint96 payment,
        bool success
    );
    
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event SubscriptionConsumerAdded(uint64 indexed subId, address consumer);
    
    constructor() {}
    
    function createSubscription() external override returns (uint64) {
        uint64 subId = uint64(block.timestamp + uint256(uint160(msg.sender)));
        subscriptionOwners[subId] = msg.sender;
        emit SubscriptionCreated(subId, msg.sender);
        return subId;
    }
    
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external override returns (uint256) {
        // Check if msg.sender is a valid consumer for this subscription
        require(_isValidConsumer(subId, msg.sender), "Invalid consumer");
        require(numWords <= MAX_NUM_WORDS, "Too many random words requested");
        require(requestConfirmations <= MAX_REQUEST_CONFIRMATIONS, "Too many confirmations");
        
        uint256 requestId = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            requestCounts[subId]
        )));
        requestCounts[subId]++;

        emit RequestRandomWords(
            keyHash,
            requestId,
            uint256(blockhash(block.number - 1)),
            subId,
            requestConfirmations,
            callbackGasLimit,
            numWords,
            ""
        );

        // Immediately fulfill the request with mock random words
        uint256[] memory randomWords = new uint256[](numWords);
        for (uint32 i = 0; i < numWords; i++) {
            randomWords[i] = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                requestId,
                i
            )));
        }

        // Call the consumer's fulfillRandomWords function
        (bool success, ) = msg.sender.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        emit RandomWordsFulfilled(requestId, uint256(blockhash(block.number - 1)), 0, success);

        return requestId;
    }
    
    function addConsumer(uint64 subId, address consumer) external override {
        require(subscriptionOwners[subId] == msg.sender, "Invalid subscription owner");
        
        // Check if consumer is already added
        address[] storage consumers = subscriptionConsumers[subId];
        for (uint256 i = 0; i < consumers.length; i++) {
            if (consumers[i] == consumer) {
                return; // Already added, just return
            }
        }
        
        // Add new consumer
        subscriptionConsumers[subId].push(consumer);
        emit SubscriptionConsumerAdded(subId, consumer);
    }
    
    function removeConsumer(uint64 subId, address consumer) external override {
        require(subscriptionOwners[subId] == msg.sender, "Invalid subscription owner");
        
        address[] storage consumers = subscriptionConsumers[subId];
        for (uint256 i = 0; i < consumers.length; i++) {
            if (consumers[i] == consumer) {
                // Remove by swapping with last element and popping
                consumers[i] = consumers[consumers.length - 1];
                consumers.pop();
                break;
            }
        }
    }
    
    function cancelSubscription(uint64 subId, address to) external override {
        require(subscriptionOwners[subId] == msg.sender, "Invalid subscription owner");
        delete subscriptionOwners[subId];
        delete subscriptionConsumers[subId];
        // Mock implementation - in real VRF, would refund LINK tokens to 'to' address
    }
    
    function getSubscription(uint64 subId) external view override returns (
        uint96 balance,
        uint64 reqCount,
        address owner,
        address[] memory consumers_list
    ) {
        return (
            uint96(0), 
            uint64(requestCounts[subId]), 
            subscriptionOwners[subId], 
            subscriptionConsumers[subId]
        );
    }
    
    function getRequestConfig() external pure override returns (
        uint16,
        uint32,
        bytes32[] memory
    ) {
        return (uint16(MAX_REQUEST_CONFIRMATIONS), MAX_GAS_LIMIT, new bytes32[](0));
    }
    
    function requestSubscriptionOwnerTransfer(uint64 subId, address newOwner) external override {
        require(subscriptionOwners[subId] == msg.sender, "Invalid subscription owner");
        // Mock implementation
    }
    
    function acceptSubscriptionOwnerTransfer(uint64 subId) external override {
        // Mock implementation
    }
    
    function pendingRequestExists(uint64 subId) external view override returns (bool) {
        return false; // Mock always returns false
    }
    
    // Helper function to check if an address is a valid consumer
    function _isValidConsumer(uint64 subId, address consumer) internal view returns (bool) {
        address[] storage consumers = subscriptionConsumers[subId];
        for (uint256 i = 0; i < consumers.length; i++) {
            if (consumers[i] == consumer) {
                return true;
            }
        }
        return false;
    }
    
    // Helper function for testing - get consumers for a subscription
    function getConsumers(uint64 subId) external view returns (address[] memory) {
        return subscriptionConsumers[subId];
    }
}