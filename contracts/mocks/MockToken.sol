// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @notice Mock ERC20 token for testing
 */
contract MockToken is ERC20 {
    /**
     * @notice Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialSupply Initial token supply
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }

    /**
     * @notice Mint tokens (for testing)
     * @param _to Address to mint to
     * @param _amount Amount to mint
     */
    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
