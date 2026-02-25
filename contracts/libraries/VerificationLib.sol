// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VerificationLib
 * @notice Library for message verification utilities
 */
library VerificationLib {
    /**
     * @notice Calculate message hash for verification
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     * @return hash Message hash
     */
    function calculateMessageHash(
        uint32 _origin,
        bytes32 _guid,
        bytes memory _payload
    ) internal pure returns (bytes32 hash) {
        return keccak256(abi.encodePacked(_origin, _guid, _payload));
    }

    /**
     * @notice Recover signer from signature
     * @param _hash Message hash
     * @param _signature Signature
     * @return signer Recovered signer address
     */
    function recoverSigner(bytes32 _hash, bytes memory _signature) internal pure returns (address signer) {
        require(_signature.length == 65, "VerificationLib: invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "VerificationLib: invalid signature v value");
        
        signer = ecrecover(_hash, v, r, s);
        require(signer != address(0), "VerificationLib: invalid signature");
    }
}
