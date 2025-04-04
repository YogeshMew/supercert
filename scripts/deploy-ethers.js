const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt user for input
function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    try {
        // Connect to Sepolia network
        const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/H2EXPUTW59m413EFjSpX2Ci8Q-s8NYbl');
        
        console.log('\n=== Contract Deployment Options ===');
        console.log('1. Use default private key (not recommended for production)');
        console.log('2. Enter your own private key');
        
        const option = await prompt('Select an option (1 or 2): ');
        
        let wallet;
        if (option === '2') {
            // Get user's private key
            const userPrivateKey = await prompt('Enter your private key (without 0x prefix): ');
            
            // Validate and format the private key
            try {
                // Remove any whitespace that might have been introduced
                let formattedKey = userPrivateKey.trim().replace(/\s+/g, '');
                
                // Add 0x prefix if not present
                if (!formattedKey.startsWith('0x')) {
                    formattedKey = '0x' + formattedKey;
                }
                
                // Create wallet with formatted key
                wallet = new ethers.Wallet(formattedKey, provider);
            } catch (error) {
                console.error('\nInvalid private key format. Please ensure you are entering a valid 64-character hexadecimal string.');
                console.error('Error details:', error.message);
                throw new Error('Invalid private key format');
            }
        } else {
            // Use default private key
            console.log('\nWARNING: Using default private key. This account will be the contract owner.');
            const privateKey = '32cfc3a098de0af20dbc813b3807a0d0a76171bbd60fadfb2dcea9acfa4109d3';
            wallet = new ethers.Wallet(privateKey, provider);
        }
        
        console.log('\nDeploying from account:', wallet.address);
        
        // Get the balance
        const balance = await wallet.getBalance();
        console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH');
        
        // Get contract data
        const contractPath = path.join(__dirname, '../artifacts/contracts/IPFSHashStorage.sol/IPFSHashStorage.json');
        const contractJson = require(contractPath);
        
        // Create contract factory
        const factory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, wallet);
        
        // Deploy contract
        console.log('Deploying contract...');
        const contract = await factory.deploy();
        
        console.log('Waiting for deployment transaction...');
        await contract.deployed();
        
        console.log('Contract deployed at:', contract.address);
        
        // Update config file
        const configPath = path.join(__dirname, '../client/src/config.js');
        const configContent = `// Contract addresses
export const CONTRACT_ADDRESS = "${contract.address}";`;
        
        fs.writeFileSync(configPath, configContent);
        console.log('Contract address written to config.js');
        
        // Verify deployment
        const code = await provider.getCode(contract.address);
        if (code === '0x') {
            throw new Error('Contract deployment failed - no code at address');
        }
        
        console.log('Deployment completed successfully!');
        
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

main()
    .then(() => {
        rl.close();
        process.exit(0);
    })
    .catch(error => {
        console.error(error);
        rl.close();
        process.exit(1);
    });
