const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { EIDS } = require("../scripts/config");

describe("OFT", function () {
  let endpoint;
  let mockExecutor;
  let oft;
  let owner;
  let user1;
  let user2;

  const EID_LOCAL = EIDS.HARDHAT;
  const EID_REMOTE = 2;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

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

    // Deploy OFT
    const OFT = await ethers.getContractFactory("OFT");
    oft = await upgrades.deployProxy(
      OFT,
      [
        await endpoint.getAddress(),
        owner.address,
        "Omnichain Token",
        "OFT",
        INITIAL_SUPPLY,
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await oft.waitForDeployment();

    // Set peer for remote chain
    const remotePeer = ethers.zeroPadValue(await oft.getAddress(), 32);
    await oft.setPeer(EID_REMOTE, remotePeer);
  });

  describe("Deployment", function () {
    it("Should initialize with correct values", async function () {
      expect(await oft.name()).to.equal("Omnichain Token");
      expect(await oft.symbol()).to.equal("OFT");
      expect(await oft.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await oft.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("send", function () {
    const sendAmount = ethers.parseEther("100");
    const fee = ethers.parseEther("0.001");

    beforeEach(async function () {
      // Transfer tokens to user1
      await oft.transfer(user1.address, sendAmount);
    });

    it("Should send tokens and burn on source chain", async function () {
      const initialBalance = await oft.balanceOf(user1.address);
      const initialSupply = await oft.totalSupply();

      await expect(
        oft.connect(user1).send(EID_REMOTE, ethers.zeroPadValue(user2.address, 32), sendAmount, "0x", fee, { value: fee })
      )
        .to.emit(oft, "TokensSent")
        .withArgs(EID_REMOTE, ethers.zeroPadValue(user2.address, 32), sendAmount, anyValue);

      expect(await oft.balanceOf(user1.address)).to.equal(initialBalance - sendAmount);
      expect(await oft.totalSupply()).to.equal(initialSupply - sendAmount);
    });

    it("Should revert if insufficient balance", async function () {
      const largeAmount = ethers.parseEther("10000000");

      await expect(
        oft.connect(user1).send(EID_REMOTE, ethers.zeroPadValue(user2.address, 32), largeAmount, "0x", fee, { value: fee })
      ).to.be.revertedWith("OFT: insufficient balance");
    });

    it("Should revert if invalid amount", async function () {
      await expect(
        oft.connect(user1).send(EID_REMOTE, ethers.zeroPadValue(user2.address, 32), 0, "0x", fee, { value: fee })
      ).to.be.revertedWith("OFT: invalid amount");
    });

    it("Should revert when paused", async function () {
      await oft.pause();

      await expect(
        oft.connect(user1).send(EID_REMOTE, ethers.zeroPadValue(user2.address, 32), sendAmount, "0x", fee, { value: fee })
      ).to.be.revertedWithCustomError(oft, "EnforcedPause");
    });
  });

  describe("receiveTokens", function () {
    const receiveAmount = ethers.parseEther("50");
    const guid = ethers.id("test-guid");

    it("Should receive tokens and mint on destination chain", async function () {
      const initialBalance = await oft.balanceOf(user2.address);
      const initialSupply = await oft.totalSupply();

      await expect(
        endpoint.connect(owner).lzReceive(
          EID_REMOTE,
          guid,
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "uint256"],
            [ethers.zeroPadValue(user2.address, 32), receiveAmount]
          ),
          await oft.getAddress()
        )
      )
        .to.emit(oft, "TokensReceived")
        .withArgs(EID_REMOTE, user2.address, receiveAmount, guid);

      expect(await oft.balanceOf(user2.address)).to.equal(initialBalance + receiveAmount);
      expect(await oft.totalSupply()).to.equal(initialSupply + receiveAmount);
      expect(await oft.mintedMessages(guid)).to.be.true;
    });

    it("Should revert if tokens already minted", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "uint256"],
        [ethers.zeroPadValue(user2.address, 32), receiveAmount]
      );

      await endpoint.connect(owner).lzReceive(
        EID_REMOTE,
        guid,
        payload,
        await oft.getAddress()
      );

      await expect(
        endpoint.connect(owner).lzReceive(
          EID_REMOTE,
          guid,
          payload,
          await oft.getAddress()
        )
      ).to.be.revertedWith("OFT: tokens already minted");
    });

    it("Should revert if not called by endpoint", async function () {
      await expect(
        oft.connect(user1).receiveTokens(EID_REMOTE, guid, user2.address, receiveAmount)
      ).to.be.revertedWith("OFT: only endpoint");
    });
  });

  describe("Token Transfers", function () {
    it("Should transfer tokens normally", async function () {
      const amount = ethers.parseEther("100");
      await oft.transfer(user1.address, amount);
      expect(await oft.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should revert transfers when paused", async function () {
      await oft.pause();
      const amount = ethers.parseEther("100");

      await expect(
        oft.transfer(user1.address, amount)
      ).to.be.revertedWithCustomError(oft, "EnforcedPause");
    });
  });
});

// Helper for anyValue matcher (accepts any value)
const anyValue = () => true;
