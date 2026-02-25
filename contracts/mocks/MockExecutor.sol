// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IExecutor.sol";
import "../interfaces/IOApp.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockExecutor
 * @notice Mock Executor for message delivery on destination chains
 */
contract MockExecutor is IExecutor, AccessControl {
    /// @notice Role for executors
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /// @notice Mapping from message GUID to execution status
    mapping(bytes32 => bool) public executedMessages;

    /**
     * @notice Emitted when a message is executed
     * @param origin Origin endpoint ID
     * @param guid Message identifier
     * @param receiver Receiver address
     */
    event MessageExecuted(uint32 indexed origin, bytes32 indexed guid, address indexed receiver);

    /**
     * @notice Constructor
     * @param _admin Admin address
     */
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
    }

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
    ) external payable override {
        require(hasRole(EXECUTOR_ROLE, msg.sender) || msg.sender == address(this), "MockExecutor: unauthorized");
        require(_receiver != address(0), "MockExecutor: invalid receiver");
        require(!executedMessages[_guid], "MockExecutor: already executed");

        executedMessages[_guid] = true;

        // Call lzReceive on the receiver (OApp)
        IOApp(_receiver).lzReceive(_origin, _guid, _payload);

        emit MessageExecuted(_origin, _guid, _receiver);
    }

    /**
     * @notice Add an executor
     * @param _executor Executor address
     */
    function addExecutor(address _executor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(EXECUTOR_ROLE, _executor);
    }

    /**
     * @notice Remove an executor
     * @param _executor Executor address
     */
    function removeExecutor(address _executor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(EXECUTOR_ROLE, _executor);
    }
}
