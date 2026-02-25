// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "./OApp.sol";
import "./interfaces/IOFT.sol";
import "./libraries/MessageLib.sol";
import "./libraries/AddressLib.sol";

/**
 * @title OFT
 * @notice Omnichain Fungible Token - ERC20 token that can be bridged across chains
 * @dev Burns tokens on source chain, mints on destination chain
 */
contract OFT is OApp, ERC20Upgradeable, ERC20BurnableUpgradeable, IOFT {
    /// @notice Mapping from message GUID to whether tokens have been minted
    mapping(bytes32 => bool) public mintedMessages;

    /**
     * @notice Emitted when tokens are sent to another chain
     * @param dstEid Destination endpoint ID
     * @param to Receiver address
     * @param amount Amount sent
     * @param guid Message identifier
     */
    event TokensSent(uint32 indexed dstEid, bytes32 indexed to, uint256 amount, bytes32 indexed guid);

    /**
     * @notice Emitted when tokens are received from another chain
     * @param origin Origin endpoint ID
     * @param to Receiver address
     * @param amount Amount received
     * @param guid Message identifier
     */
    event TokensReceived(uint32 indexed origin, address indexed to, uint256 amount, bytes32 indexed guid);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the OFT
     * @param _endpoint Endpoint contract address
     * @param _admin Admin address
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialSupply Initial token supply
     */
    function initialize(
        address _endpoint,
        address _admin,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) public initializer {
        require(_endpoint != address(0), "OFT: invalid endpoint");
        require(_admin != address(0), "OFT: invalid admin");

        // Initialize OApp parent
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        endpoint = IEndpoint(_endpoint);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SENDER_ROLE, _admin);

        // Initialize ERC20
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();

        if (_initialSupply > 0) {
            _mint(_admin, _initialSupply);
        }
    }

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
    ) external payable override whenNotPaused nonReentrant returns (bytes32 guid) {
        require(_amount > 0, "OFT: invalid amount");
        require(_to != bytes32(0), "OFT: invalid receiver");
        require(balanceOf(msg.sender) >= _amount, "OFT: insufficient balance");
        require(msg.value >= _fee, "OFT: insufficient fee");

        // Burn tokens on source chain
        _burn(msg.sender, _amount);

        // Encode transfer data
        bytes memory payload = MessageLib.encodeOFTTransfer(_to, _amount);

        // Send cross-chain message
        guid = lzSend(_dstEid, payload, _options, _fee);

        emit TokensSent(_dstEid, _to, _amount, guid);
    }

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
    ) external override whenNotPaused nonReentrant {
        require(msg.sender == address(endpoint), "OFT: only endpoint");
        require(_to != address(0), "OFT: invalid receiver");
        require(_amount > 0, "OFT: invalid amount");
        require(!mintedMessages[_guid], "OFT: tokens already minted");

        mintedMessages[_guid] = true;

        // Mint tokens on destination chain
        _mint(_to, _amount);

        emit TokensReceived(_origin, _to, _amount, _guid);
    }

    /**
     * @notice Handle received cross-chain message
     * @param _origin Origin endpoint ID
     * @param _guid Message identifier
     * @param _payload Message payload
     */
    function _lzReceive(
        uint32 _origin,
        bytes32 _guid,
        bytes calldata _payload
    ) internal override {
        // Decode transfer data
        (bytes32 to, uint256 amount) = MessageLib.decodeOFTTransfer(_payload);

        // Convert bytes32 to address
        address receiver = AddressLib.toAddress(to);

        // Receive tokens
        receiveTokens(_origin, _guid, receiver, amount);
    }

    /**
     * @notice Override to prevent transfers during pause
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
