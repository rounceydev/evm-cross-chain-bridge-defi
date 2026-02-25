// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDVN
 * @notice Interface for Decentralized Verifier Networks
 */
interface IDVN {
    /**
     * @notice Verify a message
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     * @param _signatures Verifier signatures
     * @return verified Whether the message is verified
     */
    function verify(
        uint32 _origin,
        bytes32 _guid,
        bytes calldata _payload,
        bytes calldata _signatures
    ) external view returns (bool verified);
}
