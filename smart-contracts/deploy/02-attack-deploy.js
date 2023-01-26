const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const bank = await ethers.getContract("Bank");
  await deploy("Attacker", {
    from: deployer,
    args: [bank.address],
    log: true,
    waitConfirmations: 1,
  });
};
