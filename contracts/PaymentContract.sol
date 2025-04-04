// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract PaymentContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function fund() public payable {
        require(msg.value > 0, "Need more ETH.");
    }

    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        
        uint256 balance = address(this).balance;
        (bool success,) = owner.call{value: balance}("");
        require(success, "Failed to withdraw");
    }
}
