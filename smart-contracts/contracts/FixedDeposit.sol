// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Bank.sol";

contract FixedDeposit {
    enum FDStatus {
        NOT_REQUESTED,
        STARTED,
        CLAIM_REQUESTED,
        CLAIM_APPROVED,
        CLOSED
    }
    struct FD {
        uint256 depositedAmount;
        uint256 noOfYears;
        uint256 lockTime;
        uint256 claimAmount;
        FDStatus status;
    }
    mapping(address => FD) public fds;

    uint256 private interestRate = 5;
    uint256 private penaltyRate = 2;

    Bank bank;

    modifier isEligibleForFD(uint256 amount, uint256 noOfYears) {
        require(
            bank.getAccountStatus(msg.sender) == Bank.Status.ACTIVE,
            "openFD: Account not opened/active"
        );
        require(
            fds[msg.sender].status == FDStatus.NOT_REQUESTED ||
                fds[msg.sender].status == FDStatus.CLOSED,
            "openFD: FD already opened"
        );

        require(
            msg.value == amount,
            "openFD: Deposited amount and entered amount does not match"
        );
        require(
            msg.value >= 1 ether,
            "openFD: Minimum amount to deposit for FD is 1 ether"
        );
        require(
            noOfYears <= 10 && noOfYears >= 1,
            "openFD: noOfYears should be between 1-10 years"
        );
        _;
    }

    modifier isFDStarted() {
        require(
            fds[msg.sender].status == FDStatus.STARTED,
            "isFDStarted() FD not started"
        );
        _;
    }
    modifier onlyOwner() {
        require(
            bank.getOwner() == msg.sender,
            "onlyOwner: Only owner can perform this operation"
        );
        _;
    }
    modifier canApproveClaim(address account) {
        require(
            fds[account].status == FDStatus.CLAIM_REQUESTED,
            "canApproveClaim: Claim request does not exists"
        );
        _;
    }

    constructor(address _bankAddress) {
        bank = Bank(_bankAddress);
    }

    function openFD(
        uint256 amount,
        uint256 noOfYears
    ) public payable isEligibleForFD(amount, noOfYears) {
        fds[msg.sender] = FD(
            amount,
            noOfYears,
            block.timestamp + (noOfYears * 31556926),
            0,
            FDStatus.STARTED
        );
    }

    function checkReturns(
        address account
    ) public view returns (uint256 result) {
        unchecked {
            FD memory data = fds[account];
            if (block.timestamp < data.lockTime) {
                result = (data.depositedAmount * (100 - penaltyRate)) / 100;
            } else {
                result =
                    data.depositedAmount +
                    ((data.depositedAmount * data.noOfYears * interestRate) /
                        100);
            }
        }
        return result;
    }

    function requestClaim() public isFDStarted {
        fds[msg.sender].status = FDStatus.CLAIM_REQUESTED;
    }

    function approveClaim(
        address account
    ) public onlyOwner canApproveClaim(account) {
        fds[account].status = FDStatus.CLAIM_APPROVED;
        fds[account].claimAmount = checkReturns(account);
    }

    function withdrawClaim() external {
        FD memory fd = fds[msg.sender];
        require(
            fd.status == FDStatus.CLAIM_APPROVED,
            "withdrawClaim: Claim not Approved"
        );
        fds[msg.sender].status = FDStatus.CLOSED;
        fds[msg.sender].claimAmount = 0;
        bank.depositFDAmount{value: fd.claimAmount}(msg.sender);
    }

    function getFD(address account) public view returns (FD memory) {
        return fds[account];
    }

    function getInterestRate() public view returns (uint256) {
        return interestRate;
    }

    function setInterestRate(uint256 _interestRate) public onlyOwner {
        interestRate = _interestRate;
    }

    function getPenaltyRate() public view returns (uint256) {
        return penaltyRate;
    }

    function setPenaltyRate(uint256 _penaltyRate) public onlyOwner {
        penaltyRate = _penaltyRate;
    }
}
