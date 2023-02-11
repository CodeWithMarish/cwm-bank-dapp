// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "hardhat/console.sol";

contract Bank {
    /**
     * Variable Declaration
     */
    enum Status {
        NOT_REQUESTED,
        REQUESTED,
        ACTIVE,
        PAUSED,
        CLOSED
    }

    enum TransactionType {
        DEPOSIT,
        WITHDRAW,
        DEPOSIT_FD
    }

    enum EmployeeStatus {
        NOT_ACTIVE,
        ACTIVE
    }
    enum EmployeeType {
        MANAGER
    }
    struct Employee {
        EmployeeStatus employeeStatus;
        EmployeeType employeeType;
    }
    mapping(address => Employee) employees;
    mapping(address => Status) accountStatus;
    mapping(address => uint) balances;

    address owner;
    address fdContract;

    /**
     * Modifiers
     */

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not owner");
        _;
    }

    modifier isAccountActive() {
        require(
            accountStatus[msg.sender] == Status.ACTIVE,
            "Account not active"
        );
        _;
    }

    modifier isAccountPaused() {
        require(
            accountStatus[msg.sender] == Status.PAUSED,
            "Account not paused"
        );
        _;
    }

    modifier notEmployee(address employeeAddress) {
        require(
            employees[employeeAddress].employeeStatus ==
                EmployeeStatus.NOT_ACTIVE,
            "Employee already exists"
        );
        _;
    }

    modifier employeeExists(address employeeAddress) {
        require(
            employees[employeeAddress].employeeStatus == EmployeeStatus.ACTIVE,
            "Employee does not exists"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Functions
     */
    function openAccount() public {
        if (
            accountStatus[msg.sender] != Status.NOT_REQUESTED &&
            accountStatus[msg.sender] != Status.CLOSED
        ) {
            revert("openAccount(): You already opened a account");
        }
        accountStatus[msg.sender] = Status.REQUESTED;
    }

    function approveAccount(address account) public onlyOwner {
        require(
            accountStatus[account] == Status.REQUESTED,
            "approveAccount(): Account request does not exists"
        );
        accountStatus[account] = Status.ACTIVE;
    }

    function pauseAccount() public isAccountActive {
        accountStatus[msg.sender] = Status.PAUSED;
    }

    function unPauseAccount() public isAccountPaused {
        accountStatus[msg.sender] = Status.ACTIVE;
    }

    function closeAccount() public isAccountActive {
        require(
            balances[msg.sender] == 0,
            "closeAccount(): Withdraw all your balance to close"
        );
        accountStatus[msg.sender] = Status.CLOSED;
    }

    function deposit() public payable isAccountActive {
        require(
            msg.value > 0,
            "deposit(): Deposit Amount should be greater than zero"
        );
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external isAccountActive {
        require(
            balances[msg.sender] >= amount,
            "withdraw(): Not enough balance"
        );
        balances[msg.sender] -= amount;
        (bool status, ) = payable(msg.sender).call{value: amount}("");
        require(status, "withdraw(): Transfer failed");
        // chance of reenterancy attack
        // balances[msg.sender] -= amount;
    }

    function transferAmount(address to, uint256 amount) public isAccountActive {
        require(
            balances[msg.sender] >= amount,
            "transfer(): Not enough balance"
        );
        balances[msg.sender] -= amount;
        balances[to] += amount;
        (bool status, ) = payable(to).call{value: amount}("");
        require(status, "transfer(): Transfer failed");
    }

    function setFDContract(address _fdAddress) external onlyOwner {
        fdContract = _fdAddress;
    }

    function depositFDAmount(address account) external payable {
        require(msg.sender == fdContract, "Only FD contract can call this");
        balances[account] += msg.value;
    }

    function getAccountStatus(address account) public view returns (Status) {
        return accountStatus[account];
    }

    function accountBalance(address account) public view returns (uint) {
        require(
            accountStatus[account] == Status.ACTIVE,
            "accountBalance(): Account not active"
        );
        return balances[account];
    }

    function getFDContractAddress() public view returns (address) {
        return fdContract;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function bankBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * Adding staff and manager
     */

    function addEmployee(
        address employeeAddress,
        EmployeeType empType
    ) external onlyOwner notEmployee(employeeAddress) {
        employees[employeeAddress] = Employee(EmployeeStatus.ACTIVE, empType);
    }

    function removeEmployee(
        address employeeAddress
    ) external onlyOwner employeeExists(employeeAddress) {
        delete employees[employeeAddress];
    }

    function employeeDetails(
        address employeeAddress
    ) public view returns (Employee memory) {
        return employees[employeeAddress];
    }
}
