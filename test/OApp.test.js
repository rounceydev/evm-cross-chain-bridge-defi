const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { EIDS } = require("../scripts/config");

describe("OApp", function () {
  let endpoint;
  let mockExecutor;
  let oApp;
  let owner;
  let user1;
  let user2;

  const EID_LOCAL = EIDS.HARDHAT;
  const EID_REMOTE = 2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

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

    // Deploy OApp
    const OApp = await ethers.getContractFactory("OApp");
    oApp = await upgrades.deployProxy(
      OApp,
      [await endpoint.getAddress(), owner.address],
      { initializer: "initialize", kind: "uups" }
    );
    await oApp.waitForDeployment();

    // Grant SENDER_ROLE to user1
    const SENDER_ROLE = await oApp.SENDER_ROLE();
    await oApp.grantRole(SENDER_ROLE, user1.address);

    // Set peer for remote chain
    const remotePeer = ethers.zeroPadValue(await oApp.getAddress(), 32);
    await oApp.setPeer(EID_REMOTE, remotePeer);
  });

  describe("Deployment", function () {
    it("Should initialize correctly", async function () {
      expect(await oApp.endpoint()).to.equal(await endpoint.getAddress());
      expect(await oApp.hasRole(await oApp.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should not allow re-initialization", async function () {
      await expect(
        oApp.initialize(await endpoint.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(oApp, "InvalidInitialization");
    });
  });

  describe("lzSend", function () {
    it("Should send a message", async function () {
      const payload = ethers.toUtf8Bytes("test message");
      const fee = ethers.parseEther("0.001");

      await expect(
        oApp.connect(user1).lzSend(EID_REMOTE, payload, "0x", fee, { value: fee })
      ).to.emit(oApp, "MessageSent");
    });

    it("Should revert if unauthorized", async function () {
      const payload = ethers.toUtf8Bytes("test");
      const fee = ethers.parseEther("0.001");

      await expect(
        oApp.connect(user2).lzSend(EID_REMOTE, payload, "0x", fee, { value: fee })
      ).to.be.revertedWith("OApp: unauthorized");
    });

    it("Should revert if peer not set", async function () {
      const payload = ethers.toUtf8Bytes("test");
      const fee = ethers.parseEther("0.001");

      await expect(
        oApp.connect(user1).lzSend(999, payload, "0x", fee, { value: fee })
      ).to.be.revertedWith("OApp: peer not set");
    });

    it("Should revert if insufficient fee", async function () {
      const payload = ethers.toUtf8Bytes("test");
      const fee = ethers.parseEther("0.001");

      await expect(
        oApp.connect(user1).lzSend(EID_REMOTE, payload, "0x", fee, { value: fee - 1n })
      ).to.be.revertedWith("OApp: insufficient fee");
    });

    it("Should revert when paused", async function () {
      await oApp.pause();
      const payload = ethers.toUtf8Bytes("test");
      const fee = ethers.parseEther("0.001");

      await expect(
        oApp.connect(user1).lzSend(EID_REMOTE, payload, "0x", fee, { value: fee })
      ).to.be.revertedWithCustomError(oApp, "EnforcedPause");
    });
  });

  describe("lzReceive", function () {
    it("Should receive a message", async function () {
      const payload = ethers.toUtf8Bytes("test message");
      const guid = ethers.id("test-guid");

      await expect(
        endpoint.connect(owner).lzReceive(
          EID_REMOTE,
          guid,
          payload,
          await oApp.getAddress()
        )
      ).to.emit(oApp, "MessageReceived");
    });

    it("Should revert if not called by endpoint", async function () {
      const payload = ethers.toUtf8Bytes("test");
      const guid = ethers.id("test-guid");

      await expect(
        oApp.connect(user1).lzReceive(EID_REMOTE, guid, payload)
      ).to.be.revertedWith("OApp: only endpoint");
    });

    it("Should revert if message already received", async function () {
      const payload = ethers.toUtf8Bytes("test");
      const guid = ethers.id("test-guid");

      await endpoint.connect(owner).lzReceive(
        EID_REMOTE,
        guid,
        payload,
        await oApp.getAddress()
      );

      await expect(
        endpoint.connect(owner).lzReceive(
          EID_REMOTE,
          guid,
          payload,
          await oApp.getAddress()
        )
      ).to.be.revertedWith("OApp: message already received");
    });
  });

  describe("Peer Management", function () {
    it("Should set peer", async function () {
      const peer = ethers.zeroPadValue(user2.address, 32);
      await oApp.setPeer(999, peer);
      expect(await oApp.getPeer(999)).to.equal(peer);
    });

    it("Should revert if non-admin tries to set peer", async function () {
      const peer = ethers.zeroPadValue(user2.address, 32);
      await expect(
        oApp.connect(user1).setPeer(999, peer)
      ).to.be.revertedWithCustomError(oApp, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Pausability", function () {
    it("Should pause and unpause", async function () {
      await oApp.pause();
      expect(await oApp.paused()).to.be.true;

      await oApp.unpause();
      expect(await oApp.paused()).to.be.false;
    });
  });

  describe("Upgradeability", function () {
    it("Should upgrade the implementation", async function () {
      const OAppV2 = await ethers.getContractFactory("OApp");
      const oAppV2 = await upgrades.upgradeProxy(await oApp.getAddress(), OAppV2);
      await oAppV2.waitForDeployment();
      
      // Verify it's still the same address
      expect(await oAppV2.getAddress()).to.equal(await oApp.getAddress());
    });
  });
});
