const { expect, assert } = require("chai");
const { ethers, deployments, network } = require("hardhat");

describe("FixedDeposit", () => {
  let accounts, bank, fd, fd1;
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    await deployments.fixture();
    bank = await ethers.getContract("Bank");
    fd = await ethers.getContract("FixedDeposit");
    fd1 = await fd.connect(accounts[1]);
    let tx = await bank.openAccount();
    await tx.wait();

    let tx1 = await bank.approveAccount(accounts[0].address);
    await tx1.wait();

    let tx2 = await bank.setFDContract(fd.address);
    await tx2.wait();
  });

  describe("Starting Test", () => {
    it("Open FD fails if not eligible conditions or already stared and open fd success if eleigible", async () => {
      await expect(
        fd.openFD(ethers.utils.parseEther("1"), 9),
        "openFD: Deposited amount and entered amount does not match"
      );
      await expect(
        fd.openFD(ethers.utils.parseEther("0.9"), 10, {
          value: ethers.utils.parseEther("0.9"),
        }),
        "openFD: Minimum amount to deposit for FD is 1 ether"
      );
      await expect(
        fd.openFD(ethers.utils.parseEther("1"), 11, {
          value: ethers.utils.parseEther("1"),
        }),
        "openFD: noOfYears should be between 1-10 years"
      );
      await expect(
        fd1.openFD(ethers.utils.parseEther("1"), 10, {
          value: ethers.utils.parseEther("1"),
        }),
        "openFD: Account not opened/active"
      );

      let tx = await fd.openFD(ethers.utils.parseEther("1"), 2, {
        value: ethers.utils.parseEther("1"),
      });
      await tx.wait();
      await expect(
        fd.openFD(ethers.utils.parseEther("1"), 10, {
          value: ethers.utils.parseEther("1"),
        }),
        "openFD: FD already opened"
      );
      assert.equal(
        (await fd.getFD(accounts[0].address)).depositedAmount.toString(),
        ethers.utils.parseEther("1").toString()
      );
      assert.equal((await fd.getFD(accounts[0].address)).status, 1);
    });
    it("Check returns ", async () => {
      let tx = await fd.openFD(ethers.utils.parseEther("1"), 2, {
        value: ethers.utils.parseEther("1"),
      });
      await tx.wait();
      assert.equal(
        (await fd.getFD(accounts[0].address)).depositedAmount.toString(),
        ethers.utils.parseEther("1").toString()
      );

      assert.equal(
        (await fd.checkReturns(accounts[0].address)).toString(),
        ethers.utils.parseEther("0.98").toString()
      );
      let fdDetail = await fd.getFD(accounts[0].address);

      let tx1 = await fd.requestClaim();
      await tx1.wait();

      assert.equal((await fd.getFD(accounts[0].address)).status, 2);

      await expect(fd1.approveClaim(accounts[0].address)).to.be.revertedWith(
        "onlyOwner: Only owner can perform this operation"
      );
      await expect(fd.approveClaim(accounts[1].address)).to.be.revertedWith(
        "canApproveClaim: Claim request does not exists"
      );

      let tx2 = await fd.approveClaim(accounts[0].address);
      await tx2.wait();
      assert.equal((await fd.getFD(accounts[0].address)).status, 3);
      assert.equal(
        (await fd.getFD(accounts[0].address)).claimAmount.toString(),
        ethers.utils.parseEther("0.98").toString()
      );
      let tx3 = await fd.withdrawClaim();
      await tx3.wait();
      assert.equal((await fd.getFD(accounts[0].address)).status, 4);
      assert.equal((await fd.getFD(accounts[0].address)).claimAmount, 0);
      assert.equal(
        (await bank.accountBalance(accounts[0].address)).toString(),
        ethers.utils.parseEther("0.98").toString()
      );
      let tx4 = await fd.setPenaltyRate("3");
      await tx4.wait();

      let tx5 = await fd.setInterestRate("7");
      await tx5.wait();

      assert((await fd.getPenaltyRate()).toString(), "3");
      assert((await fd.getInterestRate()).toString(), "7");
    });

    it("Check claim value after time exceeds", async () => {
      let tx = await fd.openFD(ethers.utils.parseEther("1"), 2, {
        value: ethers.utils.parseEther("1"),
      });
      await tx.wait();
      await network.provider.send("evm_increaseTime", [60 * 3]);
      await network.provider.request({ method: "evm_mine", params: [] });
      assert.equal(
        (await fd.checkReturns(accounts[0].address)).toString(),
        ethers.utils.parseEther("1.1").toString()
      );
    });
  });
});
