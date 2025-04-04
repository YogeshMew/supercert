const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Connect to Sepolia network
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/H2EXPUTW59m413EFjSpX2Ci8Q-s8NYbl');
    
    // Get the contract address from config.js
    const configPath = path.join(__dirname, '../client/src/config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const addressMatch = configContent.match(/CONTRACT_ADDRESS = "([^"]+)"/); 
    const contractAddress = addressMatch ? addressMatch[1] : null;
    
    if (!contractAddress) {
      throw new Error('Contract address not found in config.js');
    }
    
    console.log('Contract address from config:', contractAddress);
    
    // Get the ABI from the contract JSON
    const contractJsonPath = path.join(__dirname, '../client/src/contractJson/IPFSHashStorage.json');
    const contractJson = require(contractJsonPath);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, contractJson.abi, provider);
    
    // Get the owner of the contract
    const owner = await contract.owner();
    console.log('Contract owner address:', owner);
    
    // The connected account from the error message
    const connectedAccount = '0x7c72645f73419fda5f3958724b54568f03103092';
    console.log('Connected account address:', connectedAccount);
    
    // Compare the addresses (case-insensitive)
    console.log('Are they the same?', owner.toLowerCase() === connectedAccount.toLowerCase());
    
    // Check if the deploy script wallet is the owner
    const deployPrivateKey = '32cfc3a098de0af20dbc813b3807a0d0a76171bbd60fadfb2dcea9acfa4109d3';
    const wallet = new ethers.Wallet(deployPrivateKey, provider);
    console.log('Deploy script wallet address:', wallet.address);
    console.log('Is deploy wallet the owner?', owner.toLowerCase() === wallet.address.toLowerCase());
    
    // Provide solution based on findings
    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log('\nSOLUTION:');
      console.log('The contract owner is the wallet used in the deployment script.');
      console.log('To fix this issue, you have two options:');
      console.log('1. Use the private key from the deployment script to connect to the dApp');
      console.log('2. Redeploy the contract using your current wallet address as the owner');
    } else {
      console.log('\nSOLUTION:');
      console.log('The contract owner is neither your connected account nor the deployment wallet.');
      console.log('You need to find out which account was used to deploy the contract and use that account,');
      console.log('or redeploy the contract using your current wallet address.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();