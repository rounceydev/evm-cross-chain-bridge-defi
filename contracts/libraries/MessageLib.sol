// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageLib
 * @notice Library for encoding and decoding cross-chain messages
 */
library MessageLib {
    /**
     * @notice Message structure
     * @param sender Sender address
     * @param nonce Message nonce
     * @param data Message data
     */
    struct Message {
        address sender;
        uint64 nonce;
        bytes data;
    }

    /**
     * @notice Encode a message
     * @param _sender Sender address
     * @param _nonce Message nonce
     * @param _data Message data
     * @return encoded Encoded message
     */
    function encode(
        address _sender,
        uint64 _nonce,
        bytes memory _data
    ) internal pure returns (bytes memory encoded) {
        return abi.encode(_sender, _nonce, _data);
    }

    /**
     * @notice Decode a message
     * @param _encoded Encoded message
     * @return message Decoded message struct
     */
    function decode(bytes memory _encoded) internal pure returns (Message memory message) {
        (message.sender, message.nonce, message.data) = abi.decode(_encoded, (address, uint64, bytes));
    }

    /**
     * @notice Encode OFT transfer data
     * @param _to Receiver address
     * @param _amount Amount to transfer
     * @return encoded Encoded transfer data
     */
    function encodeOFTTransfer(bytes32 _to, uint256 _amount) internal pure returns (bytes memory encoded) {
        return abi.encode(_to, _amount);
    }

    /**
     * @notice Decode OFT transfer data
     * @param _encoded Encoded transfer data
     * @return to Receiver address
     * @return amount Amount to transfer
     */
    function decodeOFTTransfer(bytes memory _encoded) internal pure returns (bytes32 to, uint256 amount) {
        (to, amount) = abi.decode(_encoded, (bytes32, uint256));
    }
}
