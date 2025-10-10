const hre = require("hardhat");

async function main() {
  // 7 days in seconds
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;

  console.log(`Fast-forwarding time by ${sevenDaysInSeconds} seconds (7 days)...`);

  // Increase the time on the local Hardhat Network
  await hre.network.provider.send("evm_increaseTime", [sevenDaysInSeconds]);

  // Mine a new block to apply the time change
  await hre.network.provider.send("evm_mine");

  console.log("Time successfully fast-forwarded and a new block has been mined.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });