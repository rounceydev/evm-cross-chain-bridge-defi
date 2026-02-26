const { ethers } = require("hardhat");
const { EIDS } = require("./config");

/**
 * @notice Script to set up cross-chain peers between two deployed contracts
 * @dev This simulates setting up peers between chains
 * 
 * Usage:
 *   npx hardhat run scripts/setup-cross-chain.js --network sepolia
 *   npx hardhat run scripts/setup-cross-chain.js --network arbitrumSepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up cross-chain peers with account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

  // Contract addresses (update these after deployment)
  const CONTRACT_ADDRESSES = {
    sepolia: {
      oApp: process.env.SEPOLIA_OAPP_ADDRESS || "",
      oft: process.env.SEPOLIA_OFT_ADDRESS || "",
    },
    arbitrumSepolia: {
      oApp: process.env.ARBITRUM_SEPOLIA_OAPP_ADDRESS || "",
      oft: process.env.ARBITRUM_SEPOLIA_OFT_ADDRESS || "",
    },
  };

  // Get contract addresses for current network
  const currentNetwork = network.name;
  let oAppAddress, oftAddress;

  if (currentNetwork === "sepolia") {
    oAppAddress = CONTRACT_ADDRESSES.sepolia.oApp;
    oftAddress = CONTRACT_ADDRESSES.sepolia.oft;
  } else if (currentNetwork === "arbitrumSepolia") {
    oAppAddress = CONTRACT_ADDRESSES.arbitrumSepolia.oApp;
    oftAddress = CONTRACT_ADDRESSES.arbitrumSepolia.oft;
  } else {
    console.log("Please set contract addresses in the script for network:", currentNetwork);
    return;
  }

  if (!oAppAddress || !oftAddress) {
    console.log("Please set OAPP_ADDRESS and OFT_ADDRESS environment variables");
    return;
  }

  const OApp = await ethers.getContractFactory("OApp");
  const OFT = await ethers.getContractFactory("OFT");

  const oApp = OApp.attach(oAppAddress);
  const oft = OFT.attach(oftAddress);

  // Example: Set peer for Sepolia -> Arbitrum Sepolia
  if (currentNetwork === "sepolia") {
    const arbitrumOAppAddress = CONTRACT_ADDRESSES.arbitrumSepolia.oApp;
    const arbitrumOFTAddress = CONTRACT_ADDRESSES.arbitrumSepolia.oft;

    if (arbitrumOAppAddress && arbitrumOFTAddress) {
      console.log("\nSetting peers for Sepolia -> Arbitrum Sepolia...");
      
      // Convert addresses to bytes32
      const arbitrumOAppBytes32 = ethers.zeroPadValue(arbitrumOAppAddress, 32);
      const arbitrumOFTBytes32 = ethers.zeroPadValue(arbitrumOFTAddress, 32);

      // Set peers
      await oApp.setPeer(EIDS.ARBITRUM_SEPOLIA, arbitrumOAppBytes32);
      console.log("OApp peer set for Arbitrum Sepolia");

      await oft.setPeer(EIDS.ARBITRUM_SEPOLIA, arbitrumOFTBytes32);
      console.log("OFT peer set for Arbitrum Sepolia");
    }
  }

  // Example: Set peer for Arbitrum Sepolia -> Sepolia
  if (currentNetwork === "arbitrumSepolia") {
    const sepoliaOAppAddress = CONTRACT_ADDRESSES.sepolia.oApp;
    const sepoliaOFTAddress = CONTRACT_ADDRESSES.sepolia.oft;

    if (sepoliaOAppAddress && sepoliaOFTAddress) {
      console.log("\nSetting peers for Arbitrum Sepolia -> Sepolia...");
      
      // Convert addresses to bytes32
      const sepoliaOAppBytes32 = ethers.zeroPadValue(sepoliaOAppAddress, 32);
      const sepoliaOFTBytes32 = ethers.zeroPadValue(sepoliaOFTAddress, 32);

      // Set peers
      await oApp.setPeer(EIDS.SEPOLIA, sepoliaOAppBytes32);
      console.log("OApp peer set for Sepolia");

      await oft.setPeer(EIDS.SEPOLIA, sepoliaOFTBytes32);
      console.log("OFT peer set for Sepolia");
    }
  }

  console.log("\n=== Cross-chain setup complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
