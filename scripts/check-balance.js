const { ethers } = require("hardhat");

async function main() {
  try {
    const [account] = await ethers.getSigners();
    console.log("Checking balance for account:", account.address);

    const balance = await ethers.provider.getBalance(account.address);
    console.log("Balance:", ethers.utils.formatEther(balance), "ETH");

    if (balance.eq(0)) {
      console.log("\nYou need Sepolia ETH to deploy contracts!");
      console.log("Get some from: https://sepoliafaucet.com/");
    }
  } catch (error) {
    console.error("Error checking balance:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
