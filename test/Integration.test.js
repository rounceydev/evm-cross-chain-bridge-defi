const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { EIDS } = require("../scripts/config");

/**
 * @notice Integration tests simulating cross-chain message flow
 */
describe("Integration Tests", function () {
  let endpoint1, endpoint2;
  let mockExecutor1, mockExecutor2;
  let oApp1, oApp2;
  let oft1, oft2;
  let owner, user1;

  const EID_CHAIN1 = EIDS.HARDHAT;
  const EID_CHAIN2 = 2;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy MockExecutors
    const MockExecutor = await ethers.getContractFactory("MockExecutor");
    mockExecutor1 = await MockExecutor.deploy(owner.address);
    await mockExecutor1.waitForDeployment();
    mockExecutor2 = await MockExecutor.deploy(owner.address);
    await mockExecutor2.waitForDeployment();

    // Deploy Endpoints
    const Endpoint = await ethers.getContractFactory("Endpoint");
    endpoint1 = await Endpoint.deploy(EID_CHAIN1);
    await endpoint1.waitForDeployment();
    endpoint2 = await Endpoint.deploy(EID_CHAIN2);
    await endpoint2.waitForDeployment();

    // Configure Endpoints
    await endpoint1.setExecutor(EID_CHAIN2, await mockExecutor1.getAddress());
    await endpoint2.setExecutor(EID_CHAIN1, await mockExecutor2.getAddress());

    // Deploy OApps
    const OApp = await ethers.getContractFactory("OApp");
    oApp1 = await upgrades.deployProxy(
      OApp,
      [await endpoint1.getAddress(), owner.address],
      { initializer: "initialize", kind: "uups" }
    );
    await oApp1.waitForDeployment();
    oApp2 = await upgrades.deployProxy(
      OApp,
      [await endpoint2.getAddress(), owner.address],
      { initializer: "initialize", kind: "uups" }
    );
    await oApp2.waitForDeployment();

    // Set peers
    const peer1 = ethers.zeroPadValue(await oApp1.getAddress(), 32);
    const peer2 = ethers.zeroPadValue(await oApp2.getAddress(), 32);
    await oApp1.setPeer(EID_CHAIN2, peer2);
    await oApp2.setPeer(EID_CHAIN1, peer1);

    // Grant SENDER_ROLE
    const SENDER_ROLE = await oApp1.SENDER_ROLE();
    await oApp1.grantRole(SENDER_ROLE, user1.address);
    await oApp2.grantRole(SENDER_ROLE, user1.address);

    // Deploy OFTs
    const OFT = await ethers.getContractFactory("OFT");
    oft1 = await upgrades.deployProxy(
      OFT,
      [
        await endpoint1.getAddress(),
        owner.address,
        "OFT Chain1",
        "OFT1",
        ethers.parseEther("1000000"),
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await oft1.waitForDeployment();
    oft2 = await upgrades.deployProxy(
      OFT,
      [
        await endpoint2.getAddress(),
        owner.address,
        "OFT Chain2",
        "OFT2",
        ethers.parseEther("1000000"),
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await oft2.waitForDeployment();

    // Set OFT peers
    const oftPeer1 = ethers.zeroPadValue(await oft1.getAddress(), 32);
    const oftPeer2 = ethers.zeroPadValue(await oft2.getAddress(), 32);
    await oft1.setPeer(EID_CHAIN2, oftPeer2);
    await oft2.setPeer(EID_CHAIN1, oftPeer1);
  });

  describe("Cross-Chain Message Flow", function () {
    it("Should send and receive a message between chains", async function () {
      const payload = ethers.toUtf8Bytes("Hello from Chain1");
      const fee = ethers.parseEther("0.001");

      // Send message from Chain1 to Chain2
      const tx = await oApp1.connect(user1).lzSend(EID_CHAIN2, payload, "0x", fee, { value: fee });
      const receipt = await tx.wait();

      // Extract guid from event
      const event = receipt.logs.find(
        (log) => log.topics[0] === ethers.id("MessageSent(uint32,bytes32)")
      );
      const guid = "0x" + event.topics[2].slice(26);

      // Simulate message delivery on Chain2
      // In a real scenario, this would be done by an off-chain relayer
      // Here we simulate it by calling lzReceive directly
      await expect(
        endpoint2.connect(owner).lzReceive(
          EID_CHAIN1,
          guid,
          payload,
          await oApp2.getAddress()
        )
      ).to.emit(oApp2, "MessageReceived");
    });
  });

  describe("Cross-Chain Token Bridging", function () {
    it("Should bridge tokens from Chain1 to Chain2", async function () {
      const bridgeAmount = ethers.parseEther("100");
      const fee = ethers.parseEther("0.001");

      // Transfer tokens to user1
      await oft1.transfer(user1.address, bridgeAmount);

      // Send tokens from Chain1 to Chain2
      const tx = await oft1.connect(user1).send(
        EID_CHAIN2,
        ethers.zeroPadValue(user1.address, 32),
        bridgeAmount,
        "0x",
        fee,
        { value: fee }
      );
      const receipt = await tx.wait();

      // Verify tokens burned on Chain1
      expect(await oft1.balanceOf(user1.address)).to.equal(0);
      expect(await oft1.totalSupply()).to.equal(ethers.parseEther("999900"));

      // Extract guid from event
      const event = receipt.logs.find(
        (log) => log.topics[0] === ethers.id("TokensSent(uint32,bytes32,uint256,bytes32)")
      );
      const guid = "0x" + event.topics[3].slice(26);

      // Simulate message delivery and token minting on Chain2
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "uint256"],
        [ethers.zeroPadValue(user1.address, 32), bridgeAmount]
      );

      await expect(
        endpoint2.connect(owner).lzReceive(
          EID_CHAIN1,
          guid,
          payload,
          await oft2.getAddress()
        )
      )
        .to.emit(oft2, "TokensReceived")
        .withArgs(EID_CHAIN1, user1.address, bridgeAmount, guid);

      // Verify tokens minted on Chain2
      expect(await oft2.balanceOf(user1.address)).to.equal(bridgeAmount);
      expect(await oft2.totalSupply()).to.equal(ethers.parseEther("1000100"));
    });

    it("Should prevent double spending via replay protection", async function () {
      const bridgeAmount = ethers.parseEther("50");
      const fee = ethers.parseEther("0.001");

      await oft1.transfer(user1.address, bridgeAmount);

      const tx = await oft1.connect(user1).send(
        EID_CHAIN2,
        ethers.zeroPadValue(user1.address, 32),
        bridgeAmount,
        "0x",
        fee,
        { value: fee }
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        (log) => log.topics[0] === ethers.id("TokensSent(uint32,bytes32,uint256,bytes32)")
      );
      const guid = "0x" + event.topics[3].slice(26);

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "uint256"],
        [ethers.zeroPadValue(user1.address, 32), bridgeAmount]
      );

      // First execution should succeed
      await endpoint2.connect(owner).lzReceive(
        EID_CHAIN1,
        guid,
        payload,
        await oft2.getAddress()
      );

      // Second execution should fail (replay protection)
      await expect(
        endpoint2.connect(owner).lzReceive(
          EID_CHAIN1,
          guid,
          payload,
          await oft2.getAddress()
        )
      ).to.be.revertedWith("Endpoint: message already executed");
    });
  });
});
