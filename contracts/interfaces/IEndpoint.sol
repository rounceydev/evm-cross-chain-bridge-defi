// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEndpoint
 * @notice Interface for the immutable Endpoint contract that serves as the central messaging hub
 */
interface IEndpoint {
    /**
     * @notice Emitted when a message is sent
     * @param sender The address that sent the message
     * @param dstEid The destination endpoint ID (chain ID)
     * @param receiver The receiver address on the destination chain
     * @param guid The unique message identifier
     * @param payload The message payload
     */
    event MessageSent(
        address indexed sender,
        uint32 dstEid,
        bytes32 indexed receiver,
        bytes32 guid,
        bytes payload
    );

    /**
     * @notice Emitted when a message is received and executed
     * @param origin The origin endpoint ID (source chain)
     * @param guid The unique message identifier
     * @param receiver The receiver address
     * @param payload The message payload
     */
    event MessageReceived(
        uint32 origin,
        bytes32 indexed guid,
        address indexed receiver,
        bytes payload
    );

    /**
     * @notice Send a cross-chain message
     * @param _dstEid Destination endpoint ID
     * @param _receiver Receiver address on destination chain
     * @param _payload Message payload
     * @param _options Execution options (gas, fees, etc.)
     * @return guid Unique message identifier
     */
    function lzSend(
        uint32 _dstEid,
        bytes32 _receiver,
        bytes calldata _payload,
        bytes calldata _options
    ) external payable returns (bytes32 guid);

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
    ) external;

    /**
     * @notice Get the endpoint ID for this chain
     * @return eid The endpoint ID
     */
    function getEid() external view returns (uint32 eid);

    /**
     * @notice Get the nonce for a sender
     * @param _sender The sender address
     * @return nonce The current nonce
     */
    function getNonce(address _sender) external view returns (uint64 nonce);
}
