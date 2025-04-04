const ethers = require('ethers');

async function main() {
    // Connect to Sepolia network
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/H2EXPUTW59m413EFjSpX2Ci8Q-s8NYbl');
    
    // Add your private key
    const privateKey = '32cfc3a098de0af20dbc813b3807a0d0a76171bbd60fadfb2dcea9acfa4109d3';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('Deploying from account:', wallet.address);
    
    // Get the balance
    const balance = await wallet.getBalance();
    console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH');
    
    // Get contract artifacts
    const PaymentContract = require('../artifacts/contracts/PaymentContract.sol/PaymentContract.json');
    
    // Create contract factory
    const factory = new ethers.ContractFactory(
        PaymentContract.abi,
        PaymentContract.bytecode,
        wallet
    );

    // Deploy with lower gas price
    console.log('Deploying payment contract...');
    const contract = await factory.deploy({
        gasLimit: 1000000,
        gasPrice: ethers.utils.parseUnits('10', 'gwei')  // Even lower gas price
    });
    
    console.log('Waiting for deployment transaction...');
    const deployTx = await contract.deployTransaction.wait();
    
    // Get the checksummed address
    const deployedAddress = ethers.utils.getAddress(contract.address);
    
    // Print multiple formats to ensure we have the complete address
    console.log('Contract address formats:');
    console.log('1. Raw:', contract.address);
    console.log('2. Checksummed:', deployedAddress);
    console.log('3. From transaction:', deployTx.contractAddress);
    console.log('4. Lowercase:', contract.address.toLowerCase());
    
    // Verify deployment
    const code = await provider.getCode(deployedAddress);
    if (code === '0x') {
        throw new Error('Contract deployment failed - no code at address');
    }
    
    console.log('Deployment completed successfully!');
    console.log('Use this address in your Verify.jsx:', deployedAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });
