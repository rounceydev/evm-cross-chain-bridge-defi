// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOApp
 * @notice Interface for Omnichain Applications
 */
interface IOApp {
    /**
     * @notice Send a cross-chain message
     * @param _dstEid Destination endpoint ID
     * @param _payload Message payload
     * @param _options Execution options
     * @param _fee Payment for the message (native token)
     * @return guid Unique message identifier
     */
    function lzSend(
        uint32 _dstEid,
        bytes calldata _payload,
        bytes calldata _options,
        uint256 _fee
    ) external payable returns (bytes32 guid);

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
    ) external;

    /**
     * @notice Set a peer (trusted remote) for a given endpoint ID
     * @param _eid Endpoint ID
     * @param _peer Peer address
     */
    function setPeer(uint32 _eid, bytes32 _peer) external;

    /**
     * @notice Get the peer address for a given endpoint ID
     * @param _eid Endpoint ID
     * @return peer The peer address
     */
    function getPeer(uint32 _eid) external view returns (bytes32 peer);
}
