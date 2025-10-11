const hre = require("hardhat");

/**
 * Debug script to check VRF subscription setup
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log("\n❌ Usage: npx hardhat run scripts/check-vrf-setup.js --network localhost <VRF_COORDINATOR> <SUBSCRIPTION_ID> <LOTTERY_ADDRESS>\n");
    process.exit(1);
  }
  
  const VRF_COORDINATOR = args[0];
  const SUBSCRIPTION_ID = args[1];
  const LOTTERY_ADDRESS = args[2];
  
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║           VRF SUBSCRIPTION DEBUG TOOL                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  console.log("Configuration:");
  console.log("  VRF Coordinator:", VRF_COORDINATOR);
  console.log("  Subscription ID:", SUBSCRIPTION_ID);
  console.log("  Lottery Address:", LOTTERY_ADDRESS);
  console.log("");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("  Checking as:", signer.address);
  console.log("");
  
  // Get VRF Coordinator contract
  const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
  const vrfCoordinator = MockVRFCoordinator.attach(VRF_COORDINATOR);
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Subscription Details");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  try {
    const [balance, reqCount, owner, consumers] = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
    
    console.log("✅ Subscription Found!");
    console.log("  Balance:", balance.toString());
    console.log("  Request Count:", reqCount.toString());
    console.log("  Owner:", owner);
    console.log("  Number of Consumers:", consumers.length);
    console.log("");
    
    if (consumers.length > 0) {
      console.log("  Consumers:");
      consumers.forEach((consumer, i) => {
        const isLottery = consumer.toLowerCase() === LOTTERY_ADDRESS.toLowerCase();
        console.log(`    ${i + 1}. ${consumer} ${isLottery ? "✅ (LOTTERY)" : ""}`);
      });
      console.log("");
    } else {
      console.log("  ⚠️  No consumers added yet!");
      console.log("");
    }
    
    // Check if lottery is a consumer
    const isLotteryConsumer = consumers.some(
      c => c.toLowerCase() === LOTTERY_ADDRESS.toLowerCase()
    );
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Status Check");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    if (owner === signer.address) {
      console.log("✅ You are the subscription owner");
    } else {
      console.log("⚠️  You are NOT the subscription owner");
      console.log("   Owner is:", owner);
    }
    
    if (isLotteryConsumer) {
      console.log("✅ Lottery is registered as a consumer");
    } else {
      console.log("❌ Lottery is NOT registered as a consumer");
      console.log("\n   Fix by running:");
      console.log(`   await vrfCoordinator.addConsumer(${SUBSCRIPTION_ID}, "${LOTTERY_ADDRESS}")`);
    }
    
    console.log("");
    
    if (!isLotteryConsumer && owner === signer.address) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Quick Fix");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      
      console.log("Would you like to add the lottery as a consumer now? (y/n)");
      console.log("Note: Run this in interactive mode or use the command below:\n");
      console.log(`npx hardhat console --network localhost`);
      console.log(`> const vrf = await ethers.getContractAt("MockVRFCoordinator", "${VRF_COORDINATOR}")`);
      console.log(`> await vrf.addConsumer(${SUBSCRIPTION_ID}, "${LOTTERY_ADDRESS}")`);
      console.log("");
    }
    
  } catch (error) {
    console.log("❌ Error fetching subscription:", error.message);
    console.log("\nPossible issues:");
    console.log("  1. Invalid subscription ID");
    console.log("  2. Subscription doesn't exist");
    console.log("  3. VRF Coordinator address is wrong");
    console.log("");
  }
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                   DEBUG COMPLETE                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });