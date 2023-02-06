module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const bank = await ethers.getContract("Bank");
  await deploy("FixedDeposit", {
    from: deployer,
    args: [bank.address],
    log: true,
    waitConfirmations: 1,
  });
};

module.exports.tags = ["all", "fd"];
