// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOFT
 * @notice Interface for Omnichain Fungible Tokens
 */
interface IOFT {
    /**
     * @notice Send tokens to another chain
     * @param _dstEid Destination endpoint ID
     * @param _to Receiver address on destination chain
     * @param _amount Amount to send
     * @param _options Execution options
     * @param _fee Payment for the message
     * @return guid Unique message identifier
     */
    function send(
        uint32 _dstEid,
        bytes32 _to,
        uint256 _amount,
        bytes calldata _options,
        uint256 _fee
    ) external payable returns (bytes32 guid);

    /**
     * @notice Receive tokens from another chain
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _to Receiver address
     * @param _amount Amount to mint
     */
    function receiveTokens(
        uint32 _origin,
        bytes32 _guid,
        address _to,
        uint256 _amount
    ) external;
}
