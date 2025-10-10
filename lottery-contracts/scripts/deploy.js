const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy Mock USDC
  console.log("\n1. Deploying Mock USDC...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USDC", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Mock USDC deployed to:", usdcAddress);

  // Deploy Mock aToken
  console.log("\n2. Deploying Mock aToken...");
  const MockAToken = await hre.ethers.getContractFactory("MockAToken");
  const aToken = await MockAToken.deploy();
  await aToken.waitForDeployment();
  const aTokenAddress = await aToken.getAddress();
  console.log("Mock aToken deployed to:", aTokenAddress);

  // Deploy Mock Aave Pool
  console.log("\n3. Deploying Mock Aave Pool...");
  const MockAavePool = await hre.ethers.getContractFactory("MockAavePool");
  // Pass the aTokenAddress to the constructor
  const aavePool = await MockAavePool.deploy(aTokenAddress);
  await aavePool.waitForDeployment();
  const aavePoolAddress = await aavePool.getAddress();
  console.log("Mock Aave Pool deployed to:", aavePoolAddress);

  // Deploy Mock VRF Coordinator
  console.log("\n4. Deploying Mock VRF Coordinator...");
  const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
  const vrfCoordinator = await MockVRFCoordinator.deploy();
  await vrfCoordinator.waitForDeployment();
  const vrfCoordinatorAddress = await vrfCoordinator.getAddress();
  console.log("Mock VRF Coordinator deployed to:", vrfCoordinatorAddress);

  // Create VRF subscription
  console.log("\n5. Creating VRF Subscription...");
  const subscriptionId = await vrfCoordinator.createSubscription.staticCall();
  const subTx = await vrfCoordinator.createSubscription();
  await subTx.wait();
  console.log("VRF Subscription created with ID:", subscriptionId.toString());

  // Deploy NoLossLottery
  console.log("\n6. Deploying No Loss Lottery...");
  const NoLossLottery = await hre.ethers.getContractFactory("NoLossLottery");
  const lottery = await NoLossLottery.deploy(
    usdcAddress,
    aavePoolAddress,
    aTokenAddress,
    vrfCoordinatorAddress,
    "0x0000000000000000000000000000000000000000000000000000000000000000", // keyHash (not used in mock)
    subscriptionId,
    2500000 // callbackGasLimit
  );
  await lottery.waitForDeployment();
  const lotteryAddress = await lottery.getAddress();
  console.log("No Loss Lottery deployed to:", lotteryAddress);

  // Setup: Transfer USDC to contracts for testing
  console.log("\n7. Setting up test environment...");
  const transferAmount = hre.ethers.parseUnits("1000000", 18);
  
  await usdc.connect(deployer).transfer(aTokenAddress, transferAmount);
  console.log("Transferred USDC to aToken contract");

  await usdc.connect(deployer).transfer(aavePoolAddress, transferAmount);
  console.log("Transferred USDC to Aave Pool");

  console.log("\n=================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=================================");
  console.log("\nContract Addresses:");
  console.log("-------------------");
  console.log("Mock USDC:", usdcAddress);
  console.log("Mock aToken:", aTokenAddress);
  console.log("Mock Aave Pool:", aavePoolAddress);
  console.log("Mock VRF Coordinator:", vrfCoordinatorAddress);
  console.log("No Loss Lottery:", lotteryAddress);
  console.log("\n=================================");
  console.log("\nUpdate these addresses in your React app:");
  console.log("const LOTTERY_ADDRESS =", `'${lotteryAddress}';`);
  console.log("const TOKEN_ADDRESS =", `'${usdcAddress}';`);
  console.log("=================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });