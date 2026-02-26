const { expect } = require("chai");
const { ethers } = require("hardhat");
const { EIDS } = require("../scripts/config");

describe("Endpoint", function () {
  let endpoint;
  let mockDVN;
  let mockExecutor;
  let owner;
  let user1;
  let user2;

  const EID_LOCAL = EIDS.HARDHAT;
  const EID_REMOTE = 2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockDVN
    const MockDVN = await ethers.getContractFactory("MockDVN");
    mockDVN = await MockDVN.deploy(owner.address);
    await mockDVN.waitForDeployment();

    // Deploy MockExecutor
    const MockExecutor = await ethers.getContractFactory("MockExecutor");
    mockExecutor = await MockExecutor.deploy(owner.address);
    await mockExecutor.waitForDeployment();

    // Deploy Endpoint
    const Endpoint = await ethers.getContractFactory("Endpoint");
    endpoint = await Endpoint.deploy(EID_LOCAL);
    await endpoint.waitForDeployment();

    // Configure Endpoint
    await endpoint.setExecutor(EID_REMOTE, await mockExecutor.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct endpoint ID", async function () {
      expect(await endpoint.getEid()).to.equal(EID_LOCAL);
    });

    it("Should set the owner", async function () {
      expect(await endpoint.owner()).to.equal(owner.address);
    });
  });

  describe("lzSend", function () {
    it("Should send a message and emit event", async function () {
      const receiver = ethers.zeroPadValue(user2.address, 32);
      const payload = ethers.toUtf8Bytes("test message");

      await expect(endpoint.connect(user1).lzSend(EID_REMOTE, receiver, payload, "0x"))
        .to.emit(endpoint, "MessageSent")
        .withArgs(user1.address, EID_REMOTE, receiver, anyValue, payload);
    });

    it("Should increment nonce", async function () {
      const receiver = ethers.zeroPadValue(user2.address, 32);
      const payload = ethers.toUtf8Bytes("test");

      expect(await endpoint.getNonce(user1.address)).to.equal(0);
      await endpoint.connect(user1).lzSend(EID_REMOTE, receiver, payload, "0x");
      expect(await endpoint.getNonce(user1.address)).to.equal(1);
      await endpoint.connect(user1).lzSend(EID_REMOTE, receiver, payload, "0x");
      expect(await endpoint.getNonce(user1.address)).to.equal(2);
    });

    it("Should revert if sending to self", async function () {
      const receiver = ethers.zeroPadValue(user2.address, 32);
      const payload = ethers.toUtf8Bytes("test");

      await expect(
        endpoint.connect(user1).lzSend(EID_LOCAL, receiver, payload, "0x")
      ).to.be.revertedWith("Endpoint: cannot send to self");
    });

    it("Should revert if receiver is zero", async function () {
      const payload = ethers.toUtf8Bytes("test");

      await expect(
        endpoint.connect(user1).lzSend(EID_REMOTE, ethers.ZeroHash, payload, "0x")
      ).to.be.revertedWith("Endpoint: invalid receiver");
    });
  });

  describe("lzReceive", function () {
    it("Should receive and execute a message", async function () {
      const receiver = user2.address;
      const payload = ethers.toUtf8Bytes("test message");
      const guid = ethers.id("test-guid");

      await expect(
        endpoint.connect(owner).lzReceive(EID_REMOTE, guid, payload, receiver)
      )
        .to.emit(endpoint, "MessageReceived")
        .withArgs(EID_REMOTE, guid, receiver, payload);

      expect(await endpoint.executedMessages(guid)).to.be.true;
    });

    it("Should revert if message already executed", async function () {
      const receiver = user2.address;
      const payload = ethers.toUtf8Bytes("test");
      const guid = ethers.id("test-guid");

      await endpoint.connect(owner).lzReceive(EID_REMOTE, guid, payload, receiver);

      await expect(
        endpoint.connect(owner).lzReceive(EID_REMOTE, guid, payload, receiver)
      ).to.be.revertedWith("Endpoint: message already executed");
    });

    it("Should revert if executor not configured", async function () {
      const receiver = user2.address;
      const payload = ethers.toUtf8Bytes("test");
      const guid = ethers.id("test-guid");

      await expect(
        endpoint.connect(owner).lzReceive(999, guid, payload, receiver)
      ).to.be.revertedWith("Endpoint: executor not configured");
    });
  });

  describe("Configuration", function () {
    it("Should set DVN", async function () {
      await endpoint.setDVN(EID_REMOTE, await mockDVN.getAddress());
      expect(await endpoint.dvns(EID_REMOTE)).to.equal(await mockDVN.getAddress());
    });

    it("Should set Executor", async function () {
      await endpoint.setExecutor(EID_REMOTE, await mockExecutor.getAddress());
      expect(await endpoint.executors(EID_REMOTE)).to.equal(await mockExecutor.getAddress());
    });

    it("Should revert if non-owner tries to configure", async function () {
      await expect(
        endpoint.connect(user1).setDVN(EID_REMOTE, await mockDVN.getAddress())
      ).to.be.revertedWith("Endpoint: only owner");
    });
  });
});

// Helper for anyValue matcher (accepts any value)
const anyValue = () => true;
