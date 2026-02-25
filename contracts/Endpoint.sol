// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IEndpoint.sol";
import "./interfaces/IDVN.sol";
import "./interfaces/IExecutor.sol";
import "./libraries/MessageLib.sol";

/**
 * @title Endpoint
 * @notice Immutable central messaging hub for cross-chain communication
 * @dev This contract is designed to be immutable (no upgradeability)
 */
contract Endpoint is IEndpoint {
    /// @notice Endpoint ID for this chain
    uint32 public immutable eid;

    /// @notice Mapping from sender address to nonce
    mapping(address => uint64) public nonces;

    /// @notice Mapping from message GUID to whether it has been executed
    mapping(bytes32 => bool) public executedMessages;

    /// @notice Mapping from endpoint ID to DVN address
    mapping(uint32 => address) public dvns;

    /// @notice Mapping from endpoint ID to Executor address
    mapping(uint32 => address) public executors;

    /// @notice Minimum number of DVN verifications required
    mapping(uint32 => uint256) public minVerifications;

    /// @notice Owner address (for configuration, can be zero address for immutability)
    address public owner;

    /**
     * @notice Constructor
     * @param _eid Endpoint ID for this chain
     */
    constructor(uint32 _eid) {
        eid = _eid;
        owner = msg.sender;
    }

    /**
     * @notice Send a cross-chain message
     * @param _dstEid Destination endpoint ID
     * @param _receiver Receiver address on destination chain
     * @param _payload Message payload
     * @param _options Execution options
     * @return guid Unique message identifier
     */
    function lzSend(
        uint32 _dstEid,
        bytes32 _receiver,
        bytes calldata _payload,
        bytes calldata _options
    ) external payable returns (bytes32 guid) {
        require(_dstEid != eid, "Endpoint: cannot send to self");
        require(_receiver != bytes32(0), "Endpoint: invalid receiver");

        uint64 nonce = nonces[msg.sender];
        nonces[msg.sender] = nonce + 1;

        guid = keccak256(
            abi.encodePacked(
                eid,
                _dstEid,
                msg.sender,
                _receiver,
                nonce,
                _payload,
                block.timestamp
            )
        );

        emit MessageSent(msg.sender, _dstEid, _receiver, guid, _payload);
    }

    /**
     * @notice Receive and execute a verified message
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     * @param _receiver Receiver address
     */
    function lzReceive(
        uint32 _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _receiver
    ) external {
        require(_origin != eid, "Endpoint: invalid origin");
        require(_receiver != address(0), "Endpoint: invalid receiver");
        require(!executedMessages[_guid], "Endpoint: message already executed");

        // Mark message as executed (replay protection)
        executedMessages[_guid] = true;

        // Get executor for origin chain
        address executor = executors[_origin];
        require(executor != address(0), "Endpoint: executor not configured");

        // Execute message via executor
        IExecutor(executor).execute(_origin, _guid, _payload, _receiver, 0);

        emit MessageReceived(_origin, _guid, _receiver, _payload);
    }

    /**
     * @notice Set DVN for an endpoint
     * @param _eid Endpoint ID
     * @param _dvn DVN address
     */
    function setDVN(uint32 _eid, address _dvn) external {
        require(msg.sender == owner, "Endpoint: only owner");
        require(_dvn != address(0), "Endpoint: invalid DVN");
        dvns[_eid] = _dvn;
    }

    /**
     * @notice Set Executor for an endpoint
     * @param _eid Endpoint ID
     * @param _executor Executor address
     */
    function setExecutor(uint32 _eid, address _executor) external {
        require(msg.sender == owner, "Endpoint: only owner");
        require(_executor != address(0), "Endpoint: invalid executor");
        executors[_eid] = _executor;
    }

    /**
     * @notice Set minimum verifications required
     * @param _eid Endpoint ID
     * @param _minVerifications Minimum number of verifications
     */
    function setMinVerifications(uint32 _eid, uint256 _minVerifications) external {
        require(msg.sender == owner, "Endpoint: only owner");
        minVerifications[_eid] = _minVerifications;
    }

    /**
     * @notice Get the endpoint ID for this chain
     * @return eid The endpoint ID
     */
    function getEid() external view returns (uint32) {
        return eid;
    }

    /**
     * @notice Get the nonce for a sender
     * @param _sender The sender address
     * @return nonce The current nonce
     */
    function getNonce(address _sender) external view returns (uint64) {
        return nonces[_sender];
    }
}
