const { ethers } = require("hardhat");

async function main() {
  try {
    // Get the contract address from config.js
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "../client/src/config.js");
    const configContent = fs.readFileSync(configPath, "utf8");
    const addressMatch = configContent.match(/CONTRACT_ADDRESS = "([^"]+)"/);
    const contractAddress = addressMatch ? addressMatch[1] : null;

    if (!contractAddress) {
      throw new Error("Contract address not found in config.js");
    }

    console.log("Verifying contract at address:", contractAddress);

    // Get the provider and check the network
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    console.log("Connected to network:", network.name, "chainId:", network.chainId);

    // Check if there's code at the address
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("No contract code found at the specified address");
    }

    console.log("Contract code found at address!");

    // Try to interact with the contract
    const IPFSHashStorage = await ethers.getContractFactory("IPFSHashStorage");
    const contract = IPFSHashStorage.attach(contractAddress);

    // Try to call the owner() function
    const owner = await contract.owner();
    console.log("Contract owner:", owner);

    console.log("Contract verification successful!");
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
