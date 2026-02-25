# EVM Cross-Chain DeFi Bridge

A complete Solidity-based codebase for an EVM cross-chain DeFi bridge smart contract, inspired by LayerZero V2's omnichain protocol. This project implements secure cross-chain messaging and asset bridging capabilities using Hardhat as the development framework.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Deployment](#deployment)
- [Support](#Support)

## 🎯 Overview

This project is a simplified educational clone of LayerZero V2's omnichain protocol, designed for cross-chain messaging and asset bridging in DeFi applications. It provides:

- **Immutable Endpoints**: Central messaging hubs deployed on each chain
- **Omnichain Applications (OApps)**: Base contracts for sending/receiving cross-chain messages
- **Omnichain Fungible Tokens (OFTs)**: ERC-20 tokens that can be bridged across chains
- **Decentralized Verifier Networks (DVNs)**: Mock verifiers for message verification
- **Executors**: Mock executors for gas-paid message delivery

The protocol supports arbitrary data transfer and token bridging with replay protection, configurable security stacks, and upgradeable contracts using the UUPS proxy pattern.

## ✨ Key Features

### Core Components

1. **Endpoint Contract** (Immutable)
   - Central messaging hub per chain
   - Message sending with nonce management
   - Message receiving with replay protection
   - Configurable DVNs and Executors

2. **OApp Base Contract** (Upgradeable)
   - UUPS proxy pattern for upgradeability
   - Access control with roles
   - Pausability for emergency stops
   - Reentrancy protection
   - Peer management for trusted remotes

3. **OFT Contract** (Upgradeable)
   - ERC-20 token with burn/mint mechanism
   - Cross-chain token bridging
   - Lock/burn on source, mint on destination
   - Fee handling for message delivery

4. **Mock DVN**
   - Signature-based verification
   - Configurable verifiers
   - Message hash verification

5. **Mock Executor**
   - Message delivery on destination chains
   - Gas-paid execution
   - Replay protection

### Security Features

- **Replay Protection**: Nonces and GUIDs prevent message replay attacks
- **Access Control**: Role-based access control using OpenZeppelin
- **Pausability**: Emergency pause functionality for OApps
- **Reentrancy Guards**: Protection against reentrancy attacks
- **Upgradeability**: UUPS proxy pattern for controlled upgrades
- **Input Validation**: Comprehensive checks for all inputs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cross-Chain Bridge Architecture          │
└─────────────────────────────────────────────────────────────┘

Chain A                                    Chain B
┌──────────────┐                          ┌──────────────┐
│   Endpoint   │                          │   Endpoint   │
│  (Immutable) │                          │  (Immutable) │
└──────┬───────┘                          └──────┬───────┘
       │                                          │
       │                                          │
┌──────▼───────┐                          ┌──────▼───────┐
│    OApp      │                          │    OApp      │
│ (Upgradeable)│                          │ (Upgradeable) │
└──────┬───────┘                          └──────┬───────┘
       │                                          │
       │                                          │
┌──────▼───────┐                          ┌──────▼───────┐
│     OFT      │                          │     OFT      │
│ (Upgradeable)│                          │ (Upgradeable)│
└──────┬───────┘                          └──────┬───────┘
       │                                          │
       │  ┌────────────┐      ┌────────────┐     │
       │  │   MockDVN  │      │ MockExecutor│     │
       └──┤ (Verifier) │      │  (Delivery)│─────┘
          └────────────┘      └────────────┘
```

### Message Flow

1. **Sending**: User calls `lzSend()` on OApp/OFT → Endpoint emits message → Off-chain relayer picks up
2. **Verification**: DVN verifies message authenticity (mock implementation)
3. **Delivery**: Executor delivers message to destination Endpoint
4. **Execution**: Endpoint calls `lzReceive()` on destination OApp/OFT
5. **Completion**: OApp/OFT processes message (e.g., mint tokens for OFT)

## 📁 Project Structure

```
evm-cross-chain-bridge-defi/
├── contracts/
│   ├── interfaces/
│   │   ├── IEndpoint.sol      # Endpoint interface
│   │   ├── IOApp.sol           # OApp interface
│   │   ├── IOFT.sol            # OFT interface
│   │   ├── IDVN.sol            # DVN interface
│   │   └── IExecutor.sol       # Executor interface
│   ├── libraries/
│   │   ├── MessageLib.sol      # Message encoding/decoding
│   │   ├── VerificationLib.sol # Verification utilities
│   │   └── AddressLib.sol      # Address utilities
│   ├── Endpoint.sol            # Immutable endpoint contract
│   ├── OApp.sol                # Base OApp contract (UUPS)
│   ├── OFT.sol                 # Omnichain fungible token
│   └── mocks/
│       ├── MockDVN.sol         # Mock verifier
│       ├── MockExecutor.sol    # Mock executor
│       └── MockToken.sol        # Mock ERC-20 token
├── scripts/
│   ├── config.js               # Configuration (EIDs, fees, etc.)
│   ├── deploy.js               # Main deployment script
│   └── setup-cross-chain.js    # Cross-chain peer setup
├── test/
│   ├── Endpoint.test.js        # Endpoint tests
│   ├── OApp.test.js            # OApp tests
│   ├── OFT.test.js             # OFT tests
│   └── Integration.test.js     # Integration tests
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd evm-cross-chain-bridge-defi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your:
   - Private key (for deployment)
   - RPC URLs (for testnets)
   - API keys (for contract verification)

4. **Compile contracts**:
   ```bash
   npm run compile
   # or
   npx hardhat compile
   ```

## 📞 Support

- telegram: https://t.me/rouncey
- twitter:  https://x.com/rouncey_
