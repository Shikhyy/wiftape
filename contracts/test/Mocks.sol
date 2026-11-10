// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @dev Test-only ERC-20 with a public `burn`.
contract MockWif {
    string public name = "Mock WIF";
    string public symbol = "WIF";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function burn(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
    }
}

/// @dev Test-only Stock Token exposing the two functions WifTape reads.
contract MockStockToken {
    bool public oraclePaused;
    uint256 public uiMultiplier = 1e18;

    function setPaused(bool p) external {
        oraclePaused = p;
    }

    function setMultiplier(uint256 m) external {
        uiMultiplier = m;
    }
}

/// @dev Test-only Chainlink-style feed. `setAnswer` stamps the current block time.
contract MockFeed {
    int256 public answer;
    uint256 public updatedAt;

    constructor(int256 a) {
        answer = a;
        updatedAt = block.timestamp;
    }

    function setAnswer(int256 a) external {
        answer = a;
        updatedAt = block.timestamp;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
