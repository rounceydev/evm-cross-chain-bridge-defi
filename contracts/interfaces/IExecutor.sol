// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IExecutor
 * @notice Interface for message executors
 */
interface IExecutor {
    /**
     * @notice Execute a message on the destination chain
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     * @param _receiver Receiver address
     * @param _fee Payment for execution
     */
    function execute(
        uint32 _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _receiver,
        uint256 _fee
    ) external payable;
}
