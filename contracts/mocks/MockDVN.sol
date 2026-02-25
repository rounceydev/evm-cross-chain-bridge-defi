// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDVN.sol";
import "../libraries/VerificationLib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockDVN
 * @notice Mock Decentralized Verifier Network for testing
 * @dev Uses simple signature-based verification
 */
contract MockDVN is IDVN, AccessControl {
    /// @notice Role for verifiers
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Mapping from message hash to whether it has been verified
    mapping(bytes32 => bool) public verifiedMessages;

    /**
     * @notice Constructor
     * @param _admin Admin address
     */
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
    }

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
    ) external view override returns (bool verified) {
        bytes32 messageHash = VerificationLib.calculateMessageHash(_origin, _guid, _payload);
        
        // For mock, we accept any signature from a verifier
        // In production, this would verify multiple signatures from different verifiers
        if (_signatures.length >= 65) {
            address signer = VerificationLib.recoverSigner(messageHash, _signatures);
            verified = hasRole(VERIFIER_ROLE, signer);
        }
        
        return verified;
    }

    /**
     * @notice Add a verifier
     * @param _verifier Verifier address
     */
    function addVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, _verifier);
    }

    /**
     * @notice Remove a verifier
     * @param _verifier Verifier address
     */
    function removeVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, _verifier);
    }
}
