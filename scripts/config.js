/**
 * @notice Configuration file for chain endpoint IDs, peers, fees, etc.
 */

// Endpoint IDs (EIDs) for different chains
const EIDS = {
  LOCALHOST: 1,
  SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  HARDHAT: 31337,
};

// Default configuration
const DEFAULT_CONFIG = {
  // Minimum message fee (in wei)
  MIN_FEE: ethers.parseEther("0.001"),
  
  // Default gas limit for cross-chain messages
  DEFAULT_GAS_LIMIT: 200000,
  
  // Timeout for message delivery (in seconds)
  MESSAGE_TIMEOUT: 3600,
};

// Network configurations
const NETWORK_CONFIG = {
  localhost: {
    eid: EIDS.LOCALHOST,
    name: "localhost",
  },
  sepolia: {
    eid: EIDS.SEPOLIA,
    name: "sepolia",
  },
  arbitrumSepolia: {
    eid: EIDS.ARBITRUM_SEPOLIA,
    name: "arbitrum-sepolia",
  },
  hardhat: {
    eid: EIDS.HARDHAT,
    name: "hardhat",
  },
};

module.exports = {
  EIDS,
  DEFAULT_CONFIG,
  NETWORK_CONFIG,
};
