require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    sepolia: {
      url: "https://sepolia.infura.io/v3/2c5a3e6b9ff14df2b54b4c46c6674df9",
      accounts: ["32cfc3a098de0af20dbc813b3807a0d0a76171bbd60fadfb2dcea9acfa4109d3"],
      chainId: 11155111,
      gasPrice: "auto",
      gas: 2100000,
      timeout: 60000 // 1 minute
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
