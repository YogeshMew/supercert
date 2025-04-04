// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IPFSHashStorage {
    mapping(string => bool) public ipfsHashes;
    address public owner;
    bool public initialized;

    event HashStored(string indexed hash);
    event ContractInitialized(address owner);

    constructor() {
        owner = msg.sender;
        initialized = true;
        emit ContractInitialized(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can store hashes");
        require(initialized, "Contract not initialized");
        _;
    }

    function storeHash(string memory _cid) external onlyOwner {
        require(bytes(_cid).length > 0, "Hash cannot be empty");
        require(!ipfsHashes[_cid], "Hash already exists");
        
        ipfsHashes[_cid] = true;
        emit HashStored(_cid);
    }

    function hashExists(string memory _hash) external view returns (bool) {
        require(bytes(_hash).length > 0, "Hash cannot be empty");
        return ipfsHashes[_hash];
    }

    function isInitialized() external view returns (bool) {
        return initialized;
    }
}
