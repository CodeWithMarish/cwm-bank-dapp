const { expect, assert } = require("chai");
const { ethers, deployments } = require("hardhat");
true
  ? describe.skip
  : describe("Attacker", () => {
      let accounts, bank, attacker;
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        await deployments.fixture();
        bank = await ethers.getContract("Bank");
        attacker = await ethers.getContract("Attacker");
        let tx = await bank.openAccount();
        await tx.wait();
        let tx1 = await attacker.openAccount();
        await tx1.wait();
        let tx2 = await bank.approveAccount(accounts[0].address);
        await tx2.wait();
        let tx3 = await bank.approveAccount(attacker.address);
        await tx3.wait();
      });

      describe("Starting Test", () => {
        it("Drain all the ethers from bank contract", async () => {
          let tx1 = await bank.deposit({
            value: ethers.utils.parseEther("10"),
          });
          await tx1.wait();
          let tx2 = await attacker.attack({
            value: ethers.utils.parseEther("1"),
          });
          await tx2.wait();
          let bal = await attacker.getBalance();
          assert.equal(
            bal.toString(),
            ethers.utils.parseEther("11").toString()
          );
        });
      });
    });
