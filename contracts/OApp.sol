// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IEndpoint.sol";
import "./interfaces/IOApp.sol";
import "./libraries/MessageLib.sol";
import "./libraries/AddressLib.sol";

/**
 * @title OApp
 * @notice Base contract for Omnichain Applications
 * @dev Uses UUPS proxy pattern for upgradeability
 */
contract OApp is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IOApp
{
    /// @notice Role for authorized senders
    bytes32 public constant SENDER_ROLE = keccak256("SENDER_ROLE");

    /// @notice Endpoint contract address
    IEndpoint public endpoint;

    /// @notice Mapping from endpoint ID to peer address
    mapping(uint32 => bytes32) public peers;

    /// @notice Mapping from message GUID to whether it has been received
    mapping(bytes32 => bool) public receivedMessages;

    /**
     * @notice Emitted when a peer is set
     * @param eid Endpoint ID
     * @param peer Peer address
     */
    event PeerSet(uint32 indexed eid, bytes32 peer);

    /**
     * @notice Emitted when a message is sent
     * @param dstEid Destination endpoint ID
     * @param guid Message identifier
     */
    event MessageSent(uint32 indexed dstEid, bytes32 indexed guid);

    /**
     * @notice Emitted when a message is received
     * @param origin Origin endpoint ID
     * @param guid Message identifier
     */
    event MessageReceived(uint32 indexed origin, bytes32 indexed guid);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the OApp
     * @param _endpoint Endpoint contract address
     * @param _admin Admin address
     */
    function initialize(address _endpoint, address _admin) public initializer {
        require(_endpoint != address(0), "OApp: invalid endpoint");
        require(_admin != address(0), "OApp: invalid admin");

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        endpoint = IEndpoint(_endpoint);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SENDER_ROLE, _admin);
    }

    /**
     * @notice Send a cross-chain message
     * @param _dstEid Destination endpoint ID
     * @param _payload Message payload
     * @param _options Execution options
     * @param _fee Payment for the message
     * @return guid Unique message identifier
     */
    function lzSend(
        uint32 _dstEid,
        bytes calldata _payload,
        bytes calldata _options,
        uint256 _fee
    ) external payable override whenNotPaused nonReentrant returns (bytes32 guid) {
        require(hasRole(SENDER_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "OApp: unauthorized");
        require(peers[_dstEid] != bytes32(0), "OApp: peer not set");
        require(msg.value >= _fee, "OApp: insufficient fee");

        bytes32 receiver = peers[_dstEid];
        guid = endpoint.lzSend{value: _fee}(_dstEid, receiver, _payload, _options);

        emit MessageSent(_dstEid, guid);
    }

    /**
     * @notice Receive and handle a cross-chain message
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     */
    function lzReceive(
        uint32 _origin,
        bytes32 _guid,
        bytes calldata _payload
    ) external override whenNotPaused nonReentrant {
        require(msg.sender == address(endpoint), "OApp: only endpoint");
        require(!receivedMessages[_guid], "OApp: message already received");
        require(peers[_origin] == AddressLib.toBytes32(address(this)), "OApp: invalid peer");

        receivedMessages[_guid] = true;

        _lzReceive(_origin, _guid, _payload);

        emit MessageReceived(_origin, _guid);
    }

    /**
     * @notice Internal function to handle received messages (override in child contracts)
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     */
    function _lzReceive(
        uint32 _origin,
        bytes32 _guid,
        bytes calldata _payload
    ) internal virtual {
        // Override in child contracts
    }

    /**
     * @notice Set a peer (trusted remote) for a given endpoint ID
     * @param _eid Endpoint ID
     * @param _peer Peer address
     */
    function setPeer(uint32 _eid, bytes32 _peer) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_peer != bytes32(0), "OApp: invalid peer");
        peers[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }

    /**
     * @notice Get the peer address for a given endpoint ID
     * @param _eid Endpoint ID
     * @return peer The peer address
     */
    function getPeer(uint32 _eid) external view override returns (bytes32) {
        return peers[_eid];
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Authorize upgrade (UUPS)
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
