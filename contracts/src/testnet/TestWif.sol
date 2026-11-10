// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TestWif
/// @notice TESTNET ONLY stand-in for $WIF so the whole product can run for free. Anyone can call `faucet()` for test tokens.
///         This is NOT the real $WIF and has no value. Standard ERC-20 plus `burn`, matching what WifTape needs.
contract TestWif {
    string public constant name = "Test World is Flat";
    string public constant symbol = "tWIF";
    uint8 public constant decimals = 18;

    uint256 public constant FAUCET_AMOUNT = 1_000e18;
    uint256 public constant FAUCET_COOLDOWN = 10 minutes;

    uint256 public totalSupply;
    address public immutable owner;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public lastClaim;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address owner_) {
        owner = owner_;
    }

    /// @notice Get 1,000 tWIF. Once per 10 minutes per address.
    function faucet() external {
        require(block.timestamp >= lastClaim[msg.sender] + FAUCET_COOLDOWN, "FAUCET_COOLDOWN");
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner-only mint, used to seed the demo bots.
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "NOT_OWNER");
        _mint(to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        _move(from, to, amount);
        return true;
    }

    /// @notice Destroys the caller's tokens and reduces total supply (this is what WifTape's burn calls).
    function burn(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _move(address from, address to, uint256 amount) internal {
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
