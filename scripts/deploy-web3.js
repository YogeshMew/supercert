const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Connect to Sepolia network
        const web3 = new Web3('https://sepolia.infura.io/v3/2c5a3e6b9ff14df2b54b4c46c6674df9');
        
        // Add your private key
        const privateKey = '32cfc3a098de0af20dbc813b3807a0d0a76171bbd60fadfb2dcea9acfa4109d3';
        const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log('Deploying from account:', account.address);
        
        // Get the balance
        const balance = await web3.eth.getBalance(account.address);
        console.log('Account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        // Get contract data
        const contractPath = path.join(__dirname, '../artifacts/contracts/IPFSHashStorage.sol/IPFSHashStorage.json');
        const contractJson = require(contractPath);
        
        // Create contract instance
        const contract = new web3.eth.Contract(contractJson.abi);
        
        // Estimate gas
        const deploy = contract.deploy({
            data: contractJson.bytecode
        });
        
        const gas = await deploy.estimateGas();
        
        // Deploy contract
        console.log('Deploying contract...');
        const deployedContract = await deploy.send({
            from: account.address,
            gas: gas,
            gasPrice: await web3.eth.getGasPrice()
        });
        
        console.log('Contract deployed at:', deployedContract.options.address);
        
        // Update config file
        const configPath = path.join(__dirname, '../client/src/config.js');
        const configContent = `// Contract addresses
export const CONTRACT_ADDRESS = "${deployedContract.options.address}";`;
        
        fs.writeFileSync(configPath, configContent);
        console.log('Contract address written to config.js');
        
        // Verify deployment
        const code = await web3.eth.getCode(deployedContract.options.address);
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
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
