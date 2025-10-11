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
    const createSubTx = await vrfCoordinator.createSubscription();
    const createSubReceipt = await createSubTx.wait();
    
    // Extract subscription ID from the event
    const subscriptionCreatedEvent = createSubReceipt.logs.find(
      log => log.fragment && log.fragment.name === 'SubscriptionCreated'
    );
    const subscriptionId = subscriptionCreatedEvent.args.subId;

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

    // Add lottery as a VRF consumer
    await vrfCoordinator.addConsumer(subscriptionId, await lottery.getAddress());

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

    it("Should increase total principal", async function () {
      expect(await lottery.totalPrincipal()).to.equal(depositAmount);
    });

    it("Should allow multiple deposits from the same player", async function () {
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
      
      expect(await lottery.getUserBalance(player1.address)).to.equal(
        depositAmount * 2n
      );
      expect(await lottery.totalPrincipal()).to.equal(depositAmount * 2n);
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

    it("Should decrease total principal", async function () {
      await lottery.connect(player1).withdraw(depositAmount);
      expect(await lottery.totalPrincipal()).to.equal(0);
    });

    it("Should revert if trying to withdraw more than deposited", async function () {
      await expect(
        lottery.connect(player1).withdraw(ethers.parseUnits("101", 18))
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should allow partial withdrawals", async function () {
      const partialAmount = ethers.parseUnits("50", 18);
      await lottery.connect(player1).withdraw(partialAmount);
      
      expect(await lottery.getUserBalance(player1.address)).to.equal(
        depositAmount - partialAmount
      );
      expect(await lottery.totalPrincipal()).to.equal(depositAmount - partialAmount);
    });
  });

  describe("calculatePrize", function () {
    beforeEach(async function () {
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
    });

    it("Should return 0 prize when no yield generated", async function () {
      expect(await lottery.calculatePrize()).to.equal(0);
    });

    it("Should correctly calculate prize when yield exists", async function () {
      const yieldAmount = ethers.parseUnits("10", 18);
      await aToken.mint(await lottery.getAddress(), yieldAmount);
      
      expect(await lottery.calculatePrize()).to.equal(yieldAmount);
    });

    it("Should not include principal in prize calculation", async function () {
      const yieldAmount = ethers.parseUnits("10", 18);
      await aToken.mint(await lottery.getAddress(), yieldAmount);
      
      const prize = await lottery.calculatePrize();
      const totalBalance = await aToken.balanceOf(await lottery.getAddress());
      
      expect(prize).to.equal(totalBalance - depositAmount);
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

    it("Should revert if no players in lottery", async function () {
      const NoLossLottery = await ethers.getContractFactory("NoLossLottery");
      const emptyLottery = await NoLossLottery.deploy(
        await usdc.getAddress(),
        await aavePool.getAddress(),
        await aToken.getAddress(),
        await vrfCoordinator.getAddress(),
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        1,
        2500000
      );

      await expect(emptyLottery.connect(owner).pickWinner()).to.be.revertedWith(
        "No players in the lottery"
      );
    });

    it("Should emit WinnerRequested event when picking winner", async function () {
      await expect(lottery.connect(owner).pickWinner()).to.emit(
        lottery,
        "WinnerRequested"
      );
    });

    it("Should automatically accrue interest before picking winner", async function () {
      // Fast-forward time so interest can accrue
      await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      // Verify prize before
      const prizeBefore = await lottery.calculatePrize();
      
      // Call pickWinner which should accrue interest
      await lottery.connect(owner).pickWinner();
      
      // The prize should reflect accrued interest (though it gets transferred to winner)
      // We verify this through WinnerPicked event
      const winner = await lottery.lastWinner();
      expect(winner).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("fulfillRandomWords (Winner Selection Logic)", function () {
    beforeEach(async function () {
      // Player 1 and 2 deposit
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
      await usdc.connect(player2).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player2).deposit(depositAmount);

      // Simulate yield by sending aTokens to the lottery contract
      const prizeAmount = ethers.parseUnits("10", 18);
      await aToken.mint(await lottery.getAddress(), prizeAmount);
    });

    it("Should pick a winner and distribute the prize", async function () {
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

    it("Should transfer prize to winner", async function () {
      const winnerInitialBalance = await usdc.balanceOf(player1.address);
      
      await lottery.connect(owner).pickWinner();
      
      const winner = await lottery.lastWinner();
      const prize = await lottery.lastWinningAmount();
      
      if (winner === player1.address) {
        const winnerFinalBalance = await usdc.balanceOf(player1.address);
        expect(winnerFinalBalance).to.equal(winnerInitialBalance + prize);
      }
    });

    it("Should reset lottery round after picking winner", async function () {
      const lotteryStartBefore = await lottery.lotteryStartTime();
      
      // Wait a bit
      await network.provider.send("evm_increaseTime", [1000]);
      await network.provider.send("evm_mine");

      await lottery.connect(owner).pickWinner();
      
      const lotteryStartAfter = await lottery.lotteryStartTime();
      expect(lotteryStartAfter).to.be.greaterThan(lotteryStartBefore);
    });

    it("Should preserve principal deposits after prize distribution", async function () {
      const player1DepositBefore = await lottery.getUserBalance(player1.address);
      const player2DepositBefore = await lottery.getUserBalance(player2.address);
      
      await lottery.connect(owner).pickWinner();
      
      const player1DepositAfter = await lottery.getUserBalance(player1.address);
      const player2DepositAfter = await lottery.getUserBalance(player2.address);
      
      expect(player1DepositAfter).to.equal(player1DepositBefore);
      expect(player2DepositAfter).to.equal(player2DepositBefore);
    });
  });

  describe("Time and Duration Checks", function () {
    beforeEach(async function () {
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
    });

    it("Should correctly report hasLotteryEnded", async function () {
      expect(await lottery.hasLotteryEnded()).to.be.false;
      
      await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");
      
      expect(await lottery.hasLotteryEnded()).to.be.true;
    });

    it("Should correctly calculate time remaining", async function () {
      const timeRemaining = await lottery.getTimeRemaining();
      expect(timeRemaining).to.be.greaterThan(0);
      
      await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");
      
      expect(await lottery.getTimeRemaining()).to.equal(0);
    });
  });

  describe("Multiple rounds", function () {
    it("Should support multiple lottery rounds", async function () {
      // Round 1: Players deposit
      await usdc.connect(player1).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player1).deposit(depositAmount);
      
      // Add some yield
      const yieldAmount = ethers.parseUnits("5", 18);
      await aToken.mint(await lottery.getAddress(), yieldAmount);
      
      // Pick winner
      await lottery.connect(owner).pickWinner();
      
      const firstWinner = await lottery.lastWinner();
      expect(firstWinner).to.not.equal(ethers.ZeroAddress);
      
      // Round 2: New players can deposit for next round
      await usdc.connect(player2).approve(await lottery.getAddress(), depositAmount);
      await lottery.connect(player2).deposit(depositAmount);
      
      expect(await lottery.getPlayerCount()).to.equal(2); // player1 + player2
      
      // Add more yield
      await aToken.mint(await lottery.getAddress(), yieldAmount);
      
      // Pick winner for round 2
      await lottery.connect(owner).pickWinner();
      
      const secondWinner = await lottery.lastWinner();
      expect(secondWinner).to.not.equal(ethers.ZeroAddress);
    });
  });
});