const hre = require("hardhat");

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

    // Get the network
    const network = await ethers.provider.getNetwork();
    console.log("Connected to network:", network.name, "chainId:", network.chainId);

    // Deploy IPFSHashStorage contract
    console.log("Deploying IPFSHashStorage contract...");
    const IPFSHashStorage = await ethers.getContractFactory("IPFSHashStorage");
    console.log("Contract factory created, deploying...");
    
    const storage = await IPFSHashStorage.deploy();
    console.log("Deployment transaction sent, waiting for confirmation...");
    
    const receipt = await storage.deployTransaction.wait();
    console.log("Deployment transaction confirmed in block:", receipt.blockNumber);
    
    console.log("IPFSHashStorage contract deployed to:", storage.address);

    // Update the config.js file
    const fs = require("fs");
    const configPath = "./client/src/config.js";
    const configContent = `// Contract addresses
export const CONTRACT_ADDRESS = "${storage.address}";`;

    fs.writeFileSync(configPath, configContent);
    console.log("Contract address written to config.js");

    // Verify the contract was deployed successfully
    const code = await ethers.provider.getCode(storage.address);
    if (code === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }

    console.log("Deployment completed successfully!");
  } catch (error) {
    console.error("Deployment failed with error:", error);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("Not enough ETH to deploy contract - please get some Sepolia ETH from a faucet");
    } else if (error.code === 'NETWORK_ERROR') {
      console.error("Network error - please check your connection and try again");
    } else if (error.code === 'NONCE_EXPIRED') {
      console.error("Nonce has expired - please try again");
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment script failed:", error);
    process.exit(1);
  });

  //address for ipfsHash =0xcafDfC95e5E55c3a75376EA734799201f9Bb93B2
  //address for payment = 0xB6A199c4Ed5d7Ec5461c229C5A7c80FD40f48743