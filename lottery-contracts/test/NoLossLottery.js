const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("NoLossLottery", function () {
  let lottery, usdc, aToken, aavePool, vrfCoordinator;
  let owner, player1, player2;
  const depositAmount = ethers.parseUnits("100", 18);

  // Before each test, we deploy the contract and its dependencies
  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "USDC");

    // Deploy Mock aToken
    const MockAToken = await ethers.getContractFactory("MockAToken");
    aToken = await MockAToken.deploy();

    // Deploy Mock Aave Pool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    aavePool = await MockAavePool.deploy(await aToken.getAddress());

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory(
      "MockVRFCoordinator"
    );
    vrfCoordinator = await MockVRFCoordinator.deploy();

    // Create a VRF subscription
    const subscriptionId = await vrfCoordinator.createSubscription.staticCall();
    await vrfCoordinator.createSubscription();

    // Deploy NoLossLottery
    const NoLossLottery = await ethers.getContractFactory("NoLossLottery");
    lottery = await NoLossLottery.deploy(
      await usdc.getAddress(),
      await aavePool.getAddress(),
      await aToken.getAddress(),
      await vrfCoordinator.getAddress(),
      "0x0000000000000000000000000000000000000000000000000000000000000000", // keyHash
      subscriptionId,
      2500000 // callbackGasLimit
    );

    // Give players some USDC to test with
    await usdc.mint(player1.address, ethers.parseUnits("1000", 18));
    await usdc.mint(player2.address, ethers.parseUnits("1000", 18));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await lottery.owner()).to.equal(owner.address);
    });

    it("Should set the correct initial values", async function () {
      expect(await lottery.depositToken()).to.equal(await usdc.getAddress());
      expect(await lottery.aavePool()).to.equal(await aavePool.getAddress());
      expect(await lottery.lotteryDuration()).to.equal(7 * 24 * 60 * 60);
    });
  });

  describe("deposit", function () {
    beforeEach(async function () {
      // Player 1 approves the lottery contract to spend their USDC
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      // Player 1 deposits
      await lottery.connect(player1).deposit(depositAmount);
    });

    it("Should accept deposits and add player", async function () {
      expect(await lottery.getUserBalance(player1.address)).to.equal(
        depositAmount
      );
      expect(await lottery.getPlayerCount()).to.equal(1);
      const players = await lottery.getPlayers();
      expect(players[0]).to.equal(player1.address);
    });

    it("Should transfer tokens to the Aave pool", async function () {
      // The mock pool receives the funds
      expect(await aavePool.suppliedAmounts(await lottery.getAddress())).to.equal(
        depositAmount
      );
    });

    it("Should revert if amount is zero", async function () {
      await expect(
        lottery.connect(player1).deposit(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
    });

    it("Should allow a player to withdraw their funds", async function () {
      const initialBalance = await usdc.balanceOf(player1.address);
      await lottery.connect(player1).withdraw(depositAmount);
      const finalBalance = await usdc.balanceOf(player1.address);

      expect(finalBalance).to.be.above(initialBalance);
      expect(await lottery.getUserBalance(player1.address)).to.equal(0);
    });

    it("Should revert if trying to withdraw more than deposited", async function () {
      await expect(
        lottery.connect(player1).withdraw(ethers.parseUnits("101", 18))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("pickWinner", function () {
    beforeEach(async function () {
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
    });

    it("Should revert if called by non-owner", async function () {
      await expect(lottery.connect(player1).pickWinner()).to.be.revertedWith(
        "Only owner can call this function"
      );
    });

    it("Should revert if lottery duration has not passed", async function () {
      await expect(lottery.connect(owner).pickWinner()).to.be.revertedWith(
        "Lottery duration not yet passed"
      );
    });

    it("Should successfully request a winner after time passes", async function () {
      // Increase time on the local blockchain
      await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      await expect(lottery.connect(owner).pickWinner()).to.emit(
        lottery,
        "WinnerRequested"
      );
    });
  });

  describe("fulfillRandomWords (Winner Selection Logic)", function () {
    beforeEach(async function () {
      // Player 1 and 2 deposit
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
      await usdc.connect(player2).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player2).deposit(depositAmount);

      // Simulate yield by sending USDC directly to the aToken contract
      const prizeAmount = ethers.parseUnits("10", 18);
     await aToken.mint(await lottery.getAddress(), prizeAmount);
    });

    it("Should pick a winner and distribute the prize", async function () {
      // Fast-forward time
      await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      // The mock VRF coordinator immediately fulfills the request,
      // so calling pickWinner will trigger fulfillRandomWords in the same transaction.
      await expect(lottery.connect(owner).pickWinner()).to.emit(
        lottery,
        "WinnerPicked"
      );
      
      const winner = await lottery.lastWinner();
      const prize = await lottery.lastWinningAmount();
      
      // Check that a winner was chosen from the players
      expect([player1.address, player2.address]).to.include(winner);

      // Check that the prize amount is correct (the yield we simulated)
      expect(prize).to.be.closeTo(ethers.parseUnits("10", 18), ethers.parseUnits("0.001", 18));
    });
  });
});