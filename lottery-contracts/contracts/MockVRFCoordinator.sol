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
    mapping(uint256 => address) public consumers;
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
    
    constructor() {}
    
    function createSubscription() external override returns (uint64) {
        uint64 subId = uint64(block.timestamp);
        consumers[subId] = msg.sender;
        return subId;
    }
    
   function requestRandomWords(
    bytes32 keyHash,
    uint64 subId,
    uint16 requestConfirmations,
    uint32 callbackGasLimit,
    uint32 numWords
) external override returns (uint256) {
    // The check for `consumers[subId] == msg.sender` is removed as the logic is now handled by `addConsumer`
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
    require(consumers[subId] == msg.sender, "Invalid subscription");
    // This mock simplifies things by only allowing one consumer per subscription.
    // When adding a new consumer, we are replacing the old one.
    // In our test, this replaces the 'owner' with the 'lottery contract' as the valid consumer.
    consumers[subId] = consumer;
}
    
    function removeConsumer(uint64 subId, address consumer) external override {
        require(consumers[subId] == msg.sender, "Invalid subscription");
        // Mock implementation - just emit event
    }
    
    function cancelSubscription(uint64 subId, address to) external override {
        require(consumers[subId] == msg.sender, "Invalid subscription");
        delete consumers[subId];
        // Mock implementation
    }
    
    function getSubscription(uint64 subId) external view override returns (
        uint96 balance,
        uint64 reqCount,
        address owner,
        address[] memory consumers_list
    ) {
        return (uint96(0), uint64(requestCounts[subId]), consumers[subId], new address[](0));
    }
    
    function getRequestConfig() external pure override returns (
        uint16,
        uint32,
        bytes32[] memory
    ) {
        return (uint16(MAX_REQUEST_CONFIRMATIONS), MAX_GAS_LIMIT, new bytes32[](0));
    }
    
    function requestSubscriptionOwnerTransfer(uint64 subId, address newOwner) external override {
        require(consumers[subId] == msg.sender, "Invalid subscription");
        // Mock implementation
    }
    
    function acceptSubscriptionOwnerTransfer(uint64 subId) external override {
        // Mock implementation
    }
    
    function pendingRequestExists(uint64 subId) external view override returns (bool) {
        return false; // Mock always returns false
    }
}
