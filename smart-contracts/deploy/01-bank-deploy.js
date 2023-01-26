module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("Bank", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
};
