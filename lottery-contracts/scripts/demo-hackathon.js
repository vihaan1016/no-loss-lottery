const hre = require("hardhat");

// Utility function for delay/dramatic effect in demos
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
  
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                                                              ║");
  console.log("║        🎰  NO-LOSS LOTTERY HACKATHON DEMO  🎰               ║");
  console.log("║                                                              ║");
  console.log("║  A lottery where everyone keeps their principal and         ║");
  console.log("║  one lucky winner gets all the yield from Aave!             ║");
  console.log("║                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("\n");

  await sleep(1000);

  // ============================================================================
  // PHASE 1: DEPLOYMENT
  // ============================================================================
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 PHASE 1: DEPLOYING CONTRACTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy Mock USDC
  console.log("1️⃣  Deploying Mock USDC...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USDC", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("   ✅ Mock USDC:", usdcAddress, "\n");

  // Deploy Mock aToken
  console.log("2️⃣  Deploying Mock aToken...");
  const MockAToken = await hre.ethers.getContractFactory("MockAToken");
  const aToken = await MockAToken.deploy();
  await aToken.waitForDeployment();
  const aTokenAddress = await aToken.getAddress();
  console.log("   ✅ Mock aToken:", aTokenAddress, "\n");

  // Deploy Mock Aave Pool
  console.log("3️⃣  Deploying Mock Aave Pool (with 5% APY)...");
  const MockAavePool = await hre.ethers.getContractFactory("MockAavePool");
  const aavePool = await MockAavePool.deploy(aTokenAddress);
  await aavePool.waitForDeployment();
  const aavePoolAddress = await aavePool.getAddress();
  console.log("   ✅ Mock Aave Pool:", aavePoolAddress, "\n");

  // Deploy Mock VRF Coordinator
  console.log("4️⃣  Deploying Mock VRF Coordinator (Chainlink VRF)...");
  const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
  const vrfCoordinator = await MockVRFCoordinator.deploy();
  await vrfCoordinator.waitForDeployment();
  const vrfCoordinatorAddress = await vrfCoordinator.getAddress();
  console.log("   ✅ VRF Coordinator:", vrfCoordinatorAddress, "\n");

  // Create VRF subscription
  console.log("5️⃣  Creating VRF Subscription...");
  const createSubTx = await vrfCoordinator.createSubscription();
  const createSubReceipt = await createSubTx.wait();
  
  // Extract subscription ID from the event
  const subscriptionCreatedEvent = createSubReceipt.logs.find(
    log => log.fragment && log.fragment.name === 'SubscriptionCreated'
  );
  const subscriptionId = subscriptionCreatedEvent.args.subId;
  
  console.log("   ✅ Subscription ID:", subscriptionId.toString(), "\n");

  // Deploy NoLossLottery
  console.log("6️⃣  Deploying No-Loss Lottery Contract...");
  const NoLossLottery = await hre.ethers.getContractFactory("NoLossLottery");
  const lottery = await NoLossLottery.deploy(
    usdcAddress,
    aavePoolAddress,
    aTokenAddress,
    vrfCoordinatorAddress,
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    subscriptionId,
    2500000
  );
  await lottery.waitForDeployment();
  const lotteryAddress = await lottery.getAddress();
  console.log("   ✅ No-Loss Lottery:", lotteryAddress, "\n");

  // Add lottery as VRF consumer
  console.log("7️⃣  Registering lottery as VRF consumer...");
  const addConsumerTx = await vrfCoordinator.addConsumer(subscriptionId, lotteryAddress);
  await addConsumerTx.wait();
  console.log("   ✅ Lottery registered with VRF\n");

  // Fund Aave Pool
  console.log("8️⃣  Funding Aave Pool with liquidity...");
  const fundAmount = hre.ethers.parseUnits("1000000", 18);
  await usdc.transfer(aavePoolAddress, fundAmount);
  console.log("   ✅ Transferred", hre.ethers.formatUnits(fundAmount, 18), "USDC to pool\n");

  await sleep(2000);

  // ============================================================================
  // PHASE 2: USER DEPOSITS
  // ============================================================================
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💰 PHASE 2: USERS DEPOSITING INTO LOTTERY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const deposits = [
    { user: user1, name: "Alice", amount: "5000" },
    { user: user2, name: "Bob", amount: "3000" },
    { user: user3, name: "Charlie", amount: "2000" }
  ];

  for (let i = 0; i < deposits.length; i++) {
    const { user, name, amount } = deposits[i];
    const depositAmount = hre.ethers.parseUnits(amount, 18);
    
    console.log(`${i + 1}️⃣  ${name} (${user.address.substring(0, 8)}...) depositing ${amount} USDC`);
    
    // Transfer USDC to user
    await usdc.connect(deployer).transfer(user.address, depositAmount);
    
    // Approve lottery contract
    await usdc.connect(user).approve(lotteryAddress, depositAmount);
    
    // Deposit into lottery
    await lottery.connect(user).deposit(depositAmount);
    
    console.log(`   ✅ ${name} deposited successfully\n`);
    await sleep(500);
  }

  const totalPrincipal = await lottery.totalPrincipal();
  const playerCount = await lottery.getPlayerCount();
  
  console.log("📊 Lottery Statistics:");
  console.log("   Total Principal:", hre.ethers.formatUnits(totalPrincipal, 18), "USDC");
  console.log("   Number of Players:", playerCount.toString());
  console.log("   Current Prize:", "0 USDC (no time has passed yet)");
  
  await sleep(2000);

  // ============================================================================
  // PHASE 3: TIME PASSING & INTEREST GENERATION
  // ============================================================================
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⏰ PHASE 3: SIMULATING 7 DAYS PASSING");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("⏩ Fast-forwarding blockchain time by 7 days...");
  const sevenDays = 7 * 24 * 60 * 60;
  await hre.network.provider.send("evm_increaseTime", [sevenDays]);
  await hre.network.provider.send("evm_mine");
  console.log("   ✅ 7 days have passed\n");

  console.log("💸 Accruing interest from Aave (5% APY)...");
  await aavePool.accrueInterestTo(lotteryAddress);
  console.log("   ✅ Interest accrued to lottery contract\n");

  const prizeBeforePick = await lottery.calculatePrize();
  const hasEnded = await lottery.hasLotteryEnded();
  
  console.log("📊 Updated Statistics:");
  console.log("   Prize Pool (Yield):", hre.ethers.formatUnits(prizeBeforePick, 18), "USDC");
  console.log("   Total Principal (Safe):", hre.ethers.formatUnits(totalPrincipal, 18), "USDC");
  console.log("   Lottery Round Ended:", hasEnded ? "Yes ✅" : "No ❌");
  console.log("   Expected APY:", "~5%");
  console.log("   Expected Weekly Yield:", "~0.096% of principal\n");

  const expectedYield = Number(hre.ethers.formatUnits(totalPrincipal, 18)) * 0.05 / 52;
  console.log("   💡 Math Check: $" + hre.ethers.formatUnits(totalPrincipal, 18) + " * 5% APY / 52 weeks");
  console.log("      = ~$" + expectedYield.toFixed(2) + " per week\n");

  await sleep(2000);

  // ============================================================================
  // PHASE 4: PICKING WINNER
  // ============================================================================
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎲 PHASE 4: PICKING A WINNER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("🎰 Requesting random number from Chainlink VRF...");
  const pickTx = await lottery.connect(deployer).pickWinner();
  await pickTx.wait();
  console.log("   ✅ Winner selection transaction confirmed\n");

  const winner = await lottery.lastWinner();
  const winningAmount = await lottery.lastWinningAmount();
  
  let winnerName = "Unknown";
  if (winner === user1.address) winnerName = "Alice";
  else if (winner === user2.address) winnerName = "Bob";
  else if (winner === user3.address) winnerName = "Charlie";

  console.log("🎉 WINNER ANNOUNCEMENT!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   🏆 Winner:", winnerName);
  console.log("   📍 Address:", winner);
  console.log("   💰 Prize Won:", hre.ethers.formatUnits(winningAmount, 18), "USDC");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await sleep(2000);

  // ============================================================================
  // PHASE 5: FINAL BALANCES
  // ============================================================================
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💵 PHASE 5: FINAL BALANCES (THE MAGIC!)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("All users' principal deposits (still in lottery):\n");
  
  for (const { user, name, amount } of deposits) {
    const balance = await lottery.getUserBalance(user.address);
    const isWinner = user.address === winner;
    
    console.log(`   ${name}:`);
    console.log(`      Principal in Lottery: ${hre.ethers.formatUnits(balance, 18)} USDC ✅`);
    console.log(`      Original Deposit: ${amount} USDC`);
    console.log(`      Lost?: NO - Can withdraw anytime!`);
    if (isWinner) {
      console.log(`      🎁 BONUS: Won ${hre.ethers.formatUnits(winningAmount, 18)} USDC in prizes!`);
    }
    console.log("");
  }

  const finalPrize = await lottery.calculatePrize();
  console.log("📊 Final Contract State:");
  console.log("   Remaining Prize Pool:", hre.ethers.formatUnits(finalPrize, 18), "USDC");
  console.log("   Total Principal (Protected):", hre.ethers.formatUnits(totalPrincipal, 18), "USDC");
  console.log("   Next Round Started:", "Yes - accepting deposits now!\n");

  await sleep(2000);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                                                              ║");
  console.log("║                    🎯 KEY TAKEAWAYS                          ║");
  console.log("║                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  
  console.log("✨ What makes this a NO-LOSS lottery?\n");
  console.log("   1. Users deposit USDC into the lottery");
  console.log("   2. Funds are deposited into Aave to earn yield");
  console.log("   3. After 7 days, ONE winner gets ALL the yield");
  console.log("   4. Everyone keeps 100% of their principal");
  console.log("   5. Users can withdraw their deposit anytime\n");
  
  console.log("🔐 Security Features:\n");
  console.log("   • Uses Chainlink VRF for provably fair randomness");
  console.log("   • Funds stored in battle-tested Aave protocol");
  console.log("   • No loss of principal - ever!");
  console.log("   • Transparent and auditable on-chain\n");

  console.log("💡 Innovation:\n");
  console.log("   • Gamifies DeFi savings");
  console.log("   • Encourages financial participation");
  console.log("   • Win-win: Save money + chance to win");
  console.log("   • Powered by Aave V3 + Chainlink VRF\n");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                                                              ║");
  console.log("║                    DEMO COMPLETED! 🎉                        ║");
  console.log("║                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Contract Addresses for Frontend Integration:\n");
  console.log("   LOTTERY_ADDRESS  =", `'${lotteryAddress}'`);
  console.log("   TOKEN_ADDRESS    =", `'${usdcAddress}'`);
  console.log("   AAVE_POOL        =", `'${aavePoolAddress}'`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Demo Error:", error);
    process.exit(1);
  });