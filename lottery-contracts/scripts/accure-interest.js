const hre = require("hardhat");

async function main() {
  // Get command line arguments for contract addresses
  const args = process.argv.slice(2);
  
  let AAVE_POOL_ADDRESS, LOTTERY_ADDRESS;
  
  if (args.length >= 2) {
    AAVE_POOL_ADDRESS = args[0];
    LOTTERY_ADDRESS = args[1];
  } else {
    console.log("\n⚠️  Please provide contract addresses as arguments:");
    console.log("Usage: npx hardhat run scripts/fast-forward.js --network localhost <AAVE_POOL_ADDRESS> <LOTTERY_ADDRESS>\n");
    console.log("Or update the addresses directly in this script.\n");
    
    // You can hardcode addresses here after deployment for easier demo
    AAVE_POOL_ADDRESS = "PASTE_YOUR_AAVE_POOL_ADDRESS_HERE";
    LOTTERY_ADDRESS = "PASTE_YOUR_LOTTERY_ADDRESS_HERE";
    
    if (!AAVE_POOL_ADDRESS || AAVE_POOL_ADDRESS === "PASTE_YOUR_AAVE_POOL_ADDRESS_HERE") {
      console.log("❌ Contract addresses not configured. Exiting...\n");
      process.exit(1);
    }
  }
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║     FAST-FORWARD TIME & ACCRUE INTEREST           ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  
  console.log("🔧 Configuration:");
  console.log("   Aave Pool:", AAVE_POOL_ADDRESS);
  console.log("   Lottery:", LOTTERY_ADDRESS);
  console.log("   Executing as:", deployer.address);
  console.log("");

  // Get contract instances
  const MockAavePool = await hre.ethers.getContractFactory("MockAavePool");
  const aavePool = MockAavePool.attach(AAVE_POOL_ADDRESS);
  
  const NoLossLottery = await hre.ethers.getContractFactory("NoLossLottery");
  const lottery = NoLossLottery.attach(LOTTERY_ADDRESS);

  // Check state before fast-forwarding
  console.log("📊 Current State:");
  console.log("-------------------");
  
  try {
    const playerCount = await lottery.getPlayerCount();
    const totalPrincipal = await lottery.totalPrincipal();
    const currentPrize = await lottery.calculatePrize();
    const timeRemaining = await lottery.getTimeRemaining();
    
    console.log("   Players:", playerCount.toString());
    console.log("   Total Principal:", hre.ethers.formatUnits(totalPrincipal, 18), "tokens");
    console.log("   Current Prize:", hre.ethers.formatUnits(currentPrize, 18), "tokens");
    console.log("   Time Remaining:", timeRemaining.toString(), "seconds");
    console.log("");
  } catch (error) {
    console.log("   Could not fetch all lottery stats (this is okay if no deposits yet)");
    console.log("");
  }

  // Fast forward time by 7 days
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;
  console.log("⏩ Fast-forwarding time by 7 days (" + sevenDaysInSeconds + " seconds)...");
  
  await hre.network.provider.send("evm_increaseTime", [sevenDaysInSeconds]);
  await hre.network.provider.send("evm_mine");
  
  console.log("✅ Time fast-forwarded successfully");
  console.log("");

  // Accrue interest to the lottery contract
  console.log("💰 Accruing interest to lottery contract...");
  
  try {
    const tx = await aavePool.accrueInterestTo(LOTTERY_ADDRESS);
    await tx.wait();
    console.log("✅ Interest accrued successfully!");
    console.log("   Transaction hash:", tx.hash);
    console.log("");
  } catch (error) {
    console.log("❌ Failed to accrue interest:", error.message);
    console.log("");
    process.exit(1);
  }

  // Check updated state
  console.log("📊 Updated State After Interest:");
  console.log("-------------------");
  
  try {
    const newPrize = await lottery.calculatePrize();
    const hasEnded = await lottery.hasLotteryEnded();
    const newTimeRemaining = await lottery.getTimeRemaining();
    
    console.log("   New Prize Pool:", hre.ethers.formatUnits(newPrize, 18), "tokens");
    console.log("   Lottery Ended:", hasEnded ? "Yes ✅" : "No ❌");
    console.log("   Time Remaining:", newTimeRemaining.toString(), "seconds");
    console.log("");
    
    if (newPrize > 0n) {
      console.log("🎉 Prize generated! Ready to pick a winner!");
      console.log("");
      console.log("Next steps for your demo:");
      console.log("1. Call pickWinner() from the owner account");
      console.log("2. The winner will receive: " + hre.ethers.formatUnits(newPrize, 18) + " tokens");
      console.log("3. All users keep their principal deposits");
    } else {
      console.log("⚠️  No prize generated yet. This could mean:");
      console.log("   - No deposits have been made");
      console.log("   - Not enough time has passed");
      console.log("   - Interest rate is set to 0");
    }
    
  } catch (error) {
    console.log("❌ Error checking updated state:", error.message);
  }
  
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║              OPERATION COMPLETE                   ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });