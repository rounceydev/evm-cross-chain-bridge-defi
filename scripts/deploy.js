const { ethers, upgrades } = require("hardhat");
const { EIDS, DEFAULT_CONFIG } = require("./config");

/**
 * @notice Main deployment script
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

  // Get endpoint ID for this chain
  const eid = getEidForChain(network.chainId);
  console.log("Endpoint ID (EID):", eid);

  // 1. Deploy Endpoint (immutable)
  console.log("\n1. Deploying Endpoint...");
  const Endpoint = await ethers.getContractFactory("Endpoint");
  const endpoint = await Endpoint.deploy(eid);
  await endpoint.waitForDeployment();
  const endpointAddress = await endpoint.getAddress();
  console.log("Endpoint deployed to:", endpointAddress);

  // 2. Deploy MockDVN
  console.log("\n2. Deploying MockDVN...");
  const MockDVN = await ethers.getContractFactory("MockDVN");
  const mockDVN = await MockDVN.deploy(deployer.address);
  await mockDVN.waitForDeployment();
  const mockDVNAddress = await mockDVN.getAddress();
  console.log("MockDVN deployed to:", mockDVNAddress);

  // 3. Deploy MockExecutor
  console.log("\n3. Deploying MockExecutor...");
  const MockExecutor = await ethers.getContractFactory("MockExecutor");
  const mockExecutor = await MockExecutor.deploy(deployer.address);
  await mockExecutor.waitForDeployment();
  const mockExecutorAddress = await mockExecutor.getAddress();
  console.log("MockExecutor deployed to:", mockExecutorAddress);

  // 4. Configure Endpoint
  console.log("\n4. Configuring Endpoint...");
  // Set executor for this chain (self)
  await endpoint.setExecutor(eid, mockExecutorAddress);
  console.log("Executor set for EID", eid);

  // 5. Deploy OApp (via proxy)
  console.log("\n5. Deploying OApp (via UUPS proxy)...");
  const OApp = await ethers.getContractFactory("OApp");
  const oApp = await upgrades.deployProxy(
    OApp,
    [endpointAddress, deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await oApp.waitForDeployment();
  const oAppAddress = await oApp.getAddress();
  console.log("OApp deployed to:", oAppAddress);

  // 6. Deploy OFT (via proxy)
  console.log("\n6. Deploying OFT (via UUPS proxy)...");
  const OFT = await ethers.getContractFactory("OFT");
  const oft = await upgrades.deployProxy(
    OFT,
    [
      endpointAddress,
      deployer.address,
      "Omnichain Token",
      "OFT",
      ethers.parseEther("1000000"), // 1M initial supply
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await oft.waitForDeployment();
  const oftAddress = await oft.getAddress();
  console.log("OFT deployed to:", oftAddress);

  // 7. Deploy MockToken (for testing)
  console.log("\n7. Deploying MockToken...");
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy(
    "Mock Token",
    "MOCK",
    ethers.parseEther("1000000")
  );
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log("MockToken deployed to:", mockTokenAddress);

  // 8. Grant SENDER_ROLE to deployer for OApp
  console.log("\n8. Configuring roles...");
  const SENDER_ROLE = await oApp.SENDER_ROLE();
  await oApp.grantRole(SENDER_ROLE, deployer.address);
  console.log("SENDER_ROLE granted to deployer");

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Endpoint ID:", eid);
  console.log("\nContract Addresses:");
  console.log("Endpoint:", endpointAddress);
  console.log("MockDVN:", mockDVNAddress);
  console.log("MockExecutor:", mockExecutorAddress);
  console.log("OApp:", oAppAddress);
  console.log("OFT:", oftAddress);
  console.log("MockToken:", mockTokenAddress);
  console.log("\n=== Next Steps ===");
  console.log("1. Set peers on OApp/OFT for cross-chain communication");
  console.log("2. Configure DVNs and Executors for other chains");
  console.log("3. Deploy to destination chains and set peers");
}

/**
 * @notice Get endpoint ID for a chain ID
 */
function getEidForChain(chainId) {
  const chainIdStr = chainId.toString();
  if (chainIdStr === "31337" || chainIdStr === "1337") {
    return EIDS.HARDHAT;
  } else if (chainIdStr === "11155111") {
    return EIDS.SEPOLIA;
  } else if (chainIdStr === "421614") {
    return EIDS.ARBITRUM_SEPOLIA;
  } else {
    // Default to chain ID as EID
    return parseInt(chainIdStr);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
