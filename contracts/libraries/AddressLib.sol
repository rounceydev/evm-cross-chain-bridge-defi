// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AddressLib
 * @notice Library for address utilities
 */
library AddressLib {
    /**
     * @notice Convert address to bytes32
     * @param _addr Address to convert
     * @return bytes32 representation
     */
    function toBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @notice Convert bytes32 to address
     * @param _bytes32 Bytes32 to convert
     * @return address representation
     */
    function toAddress(bytes32 _bytes32) internal pure returns (address) {
        return address(uint160(uint256(_bytes32)));
    }
}
