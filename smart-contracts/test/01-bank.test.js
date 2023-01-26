const { expect, assert } = require("chai");
const { ethers, deployments } = require("hardhat");
describe("Bank", () => {
  let accounts, bank;
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    await deployments.fixture();
    bank = await ethers.getContract("Bank");
    let tx = await bank.openAccount();
    await tx.wait();

    let tx1 = await bank.approveAccount(accounts[0].address);
    await tx1.wait();
  });

  describe("Starting Test", () => {
    it("Check owner, account status will be not requested", async () => {
      let owner = await bank.getOwner();
      assert.equal(accounts[0].address, owner);
      assert.equal(await bank.getAccountStatus(), 2);
    });
    it("Open new account and owner approve, cannot request new account if already open, cannot approve non existing account", async () => {
      assert.equal(await bank.getAccountStatus(), 2);

      await expect(
        bank.openAccount(),
        "openAccount(): You already opened a account"
      );

      await expect(
        bank.approveAccount(accounts[2].address),
        "approveAccount(): Account request does not exists"
      );
    });

    it("Cannot deposit if account not active, deposit amount should be greater than zero, can deposit and check balance, withdraw amount from account, cannot withdraw more than balance or account not active", async () => {
      let bank1 = await bank.connect(accounts[1]);
      await expect(
        bank1.deposit({ value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Account not active");

      await expect(
        bank.deposit({ value: ethers.utils.parseEther("0") })
      ).to.be.revertedWith(
        "deposit(): Deposit Amount should be greater than zero"
      );
      let tx = await bank.deposit({ value: ethers.utils.parseEther("1") });
      await tx.wait();

      assert(
        (await bank.accountBalance()).toString() ==
          ethers.utils.parseEther("1").toString()
      );

      let tx1 = await bank.withdraw(ethers.utils.parseEther("0.5"));
      await tx1.wait();
      assert(
        (await bank.accountBalance()).toString() ==
          ethers.utils.parseEther("0.5").toString()
      );

      await expect(
        bank.withdraw(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("withdraw(): Not enough balance");
      await expect(
        bank1.withdraw(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Account not active");
    });

    it("Cannot transfer amount if dont have enough balance,", async () => {
      let bank1 = await bank.connect(accounts[1]);
      let tx_1 = await bank.deposit({
        value: ethers.utils.parseEther("1"),
      });
      await tx_1.wait();
      await expect(
        bank1.transferAmount(
          accounts[1].address,
          ethers.utils.parseEther("0.5")
        )
      ).to.be.revertedWith("Account not active");

      let tx = await bank.transferAmount(
        accounts[1].address,
        ethers.utils.parseEther("0.5")
      );
      await tx.wait();

      let tx1 = await bank1.openAccount();
      await tx1.wait();
      await expect(
        bank1.approveAccount(accounts[1].address)
      ).to.be.revertedWith("You are not owner");
      let tx2 = await bank.approveAccount(accounts[1].address);
      await tx2.wait();

      assert.equal(
        (await bank1.accountBalance()).toString(),
        ethers.utils.parseEther("0.5").toString()
      );
    });
    it("Pause/unpause account, cannot pause if not active, cannot unpause if not paused, close account, cannot close if account not active", async () => {
      let tx = await bank.pauseAccount();
      await tx.wait();
      assert.equal(await bank.getAccountStatus(), 3);
      await expect(bank.pauseAccount()).to.be.revertedWith(
        "Account not active"
      );

      let tx1 = await bank.unPauseAccount();
      await tx1.wait();
      assert.equal(await bank.getAccountStatus(), 2);
      await expect(bank.unPauseAccount()).to.be.revertedWith(
        "Account not paused"
      );
      let tx4 = await bank.deposit({ value: ethers.utils.parseEther("1") });
      await tx4.wait();
      await expect(bank.closeAccount()).to.be.revertedWith(
        "closeAccount(): Withdraw all your balance to close"
      );
      let tx5 = await bank.withdraw(ethers.utils.parseEther("1"));
      await tx5.wait();

      let tx2 = await bank.closeAccount();
      await tx2.wait();

      assert.equal(await bank.getAccountStatus(), 4);
      await expect(bank.closeAccount()).to.be.revertedWith(
        "Account not active"
      );
    });
  });
});
