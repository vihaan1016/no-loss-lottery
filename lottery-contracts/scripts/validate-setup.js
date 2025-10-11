const hre = require("hardhat");

/**
 * Validation script to check your setup before the hackathon demo
 * Run this to ensure everything is configured correctly
 */

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║        🔍 PRE-DEMO VALIDATION CHECKLIST 🔍              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const checks = [];
  
  // Check 1: Network Connection
  console.log("1️⃣  Checking network connection...");
  try {
    const provider = hre.ethers.provider;
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log("   ✅ Connected to:", network.name);
    console.log("   ✅ Chain ID:", network.chainId.toString());
    console.log("   ✅ Current block:", blockNumber.toString());
    checks.push({ name: "Network Connection", status: "PASS" });
  } catch (error) {
    console.log("   ❌ Failed to connect:", error.message);
    checks.push({ name: "Network Connection", status: "FAIL" });
  }
  console.log("");

  // Check 2: Account Balance
  console.log("2️⃣  Checking deployer account...");
  try {
    const [deployer] = await hre.ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    const balanceInEth = hre.ethers.formatEther(balance);
    
    console.log("   ✅ Deployer address:", deployer.address);
    console.log("   ✅ Balance:", balanceInEth, "ETH");
    
    if (parseFloat(balanceInEth) < 1.0) {
      console.log("   ⚠️  Warning: Low balance for deployment");
      checks.push({ name: "Account Balance", status: "WARN" });
    } else {
      checks.push({ name: "Account Balance", status: "PASS" });
    }
  } catch (error) {
    console.log("   ❌ Failed to check account:", error.message);
    checks.push({ name: "Account Balance", status: "FAIL" });
  }
  console.log("");

  // Check 3: Compile Contracts
  console.log("3️⃣  Checking contract compilation...");
  try {
    await hre.run("compile");
    console.log("   ✅ All contracts compiled successfully");
    checks.push({ name: "Contract Compilation", status: "PASS" });
  } catch (error) {
    console.log("   ❌ Compilation failed:", error.message);
    checks.push({ name: "Contract Compilation", status: "FAIL" });
  }
  console.log("");

  // Check 4: Verify Contract Factories
  console.log("4️⃣  Verifying contract factories...");
  const contractsToCheck = [
    "MockERC20",
    "MockAToken", 
    "MockAavePool",
    "MockVRFCoordinator",
    "NoLossLottery"
  ];
  
  let allFactoriesOk = true;
  for (const contractName of contractsToCheck) {
    try {
      await hre.ethers.getContractFactory(contractName);
      console.log(`   ✅ ${contractName}`);
    } catch (error) {
      console.log(`   ❌ ${contractName}: ${error.message}`);
      allFactoriesOk = false;
    }
  }
  
  if (allFactoriesOk) {
    checks.push({ name: "Contract Factories", status: "PASS" });
  } else {
    checks.push({ name: "Contract Factories", status: "FAIL" });
  }
  console.log("");

  // Check 5: Test Deployment (Quick)
  console.log("5️⃣  Testing quick deployment...");
  try {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const testToken = await MockERC20.deploy("Test", "TST");
    await testToken.waitForDeployment();
    const address = await testToken.getAddress();
    console.log("   ✅ Test deployment successful");
    console.log("   ✅ Test contract at:", address);
    checks.push({ name: "Test Deployment", status: "PASS" });
  } catch (error) {
    console.log("   ❌ Deployment failed:", error.message);
    checks.push({ name: "Test Deployment", status: "FAIL" });
  }
  console.log("");

  // Check 6: Scripts Exist
  console.log("6️⃣  Checking demo scripts...");
  const fs = require('fs');
  const path = require('path');
  
  const scriptsToCheck = [
    "scripts/deploy.js",
    "scripts/fast-forward.js",
    "scripts/demo-hackathon.js"
  ];
  
  let allScriptsExist = true;
  for (const scriptPath of scriptsToCheck) {
    if (fs.existsSync(path.join(process.cwd(), scriptPath))) {
      console.log(`   ✅ ${scriptPath}`);
    } else {
      console.log(`   ❌ ${scriptPath} not found`);
      allScriptsExist = false;
    }
  }
  
  if (allScriptsExist) {
    checks.push({ name: "Demo Scripts", status: "PASS" });
  } else {
    checks.push({ name: "Demo Scripts", status: "WARN" });
  }
  console.log("");

  // Check 7: OpenZeppelin Contracts
  console.log("7️⃣  Checking dependencies...");
  try {
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      '@openzeppelin/contracts',
      '@chainlink/contracts',
      'hardhat',
      'ethers'
    ];
    
    let allDepsOk = true;
    for (const dep of requiredDeps) {
      if (deps[dep]) {
        console.log(`   ✅ ${dep}: ${deps[dep]}`);
      } else {
        console.log(`   ❌ ${dep}: NOT INSTALLED`);
        allDepsOk = false;
      }
    }
    
    if (allDepsOk) {
      checks.push({ name: "Dependencies", status: "PASS" });
    } else {
      checks.push({ name: "Dependencies", status: "FAIL" });
    }
  } catch (error) {
    console.log("   ⚠️  Could not read package.json");
    checks.push({ name: "Dependencies", status: "WARN" });
  }
  console.log("");

  // Final Summary
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    VALIDATION SUMMARY                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const passed = checks.filter(c => c.status === "PASS").length;
  const failed = checks.filter(c => c.status === "FAIL").length;
  const warnings = checks.filter(c => c.status === "WARN").length;

  console.log("Results:");
  checks.forEach(check => {
    const icon = check.status === "PASS" ? "✅" : 
                 check.status === "FAIL" ? "❌" : "⚠️ ";
    console.log(`   ${icon} ${check.name}: ${check.status}`);
  });

  console.log("");
  console.log(`Total: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log("");

  if (failed === 0) {
    console.log("🎉 READY FOR DEMO! All critical checks passed!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Run: npx hardhat node");
    console.log("2. Run: npx hardhat run scripts/demo-hackathon.js --network localhost");
    console.log("");
  } else {
    console.log("⚠️  ISSUES DETECTED! Please fix the failed checks before demo.");
    console.log("");
    console.log("Common fixes:");
    console.log("- Network: Make sure 'npx hardhat node' is running");
    console.log("- Dependencies: Run 'npm install'");
    console.log("- Compilation: Check for syntax errors in contracts");
    console.log("");
  }

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                 Good luck with your demo! 🚀             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((error) => {
    console.error("\n❌ Validation Error:", error);
    process.exit(1);
  });