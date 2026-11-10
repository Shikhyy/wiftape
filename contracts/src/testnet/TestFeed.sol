// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TestFeed
/// @notice TESTNET ONLY price feed with the Chainlink AggregatorV3 read interface (8 decimals).
///         A single `pusher` address (the price bot) writes prices. Used because real Chainlink feeds are not confirmed on
///         the testnet. WifTape reads it exactly like a Chainlink feed, so no contract changes are needed.
contract TestFeed {
    uint8 public constant decimals = 8;
    string public description;
    address public immutable pusher;

    uint80 private _round;
    int256 private _answer;
    uint256 private _updatedAt;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    constructor(string memory description_, int256 initialAnswer, address pusher_) {
        require(initialAnswer > 0, "BAD_PRICE");
        description = description_;
        pusher = pusher_;
        _push(initialAnswer);
    }

    /// @notice Write a new price. Only the pusher can call it.
    function push(int256 answer) external {
        require(msg.sender == pusher, "NOT_PUSHER");
        require(answer > 0, "BAD_PRICE");
        _push(answer);
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (_round, _answer, _updatedAt, _updatedAt, _round);
    }

    function _push(int256 answer) internal {
        _round++;
        _answer = answer;
        _updatedAt = block.timestamp;
        emit AnswerUpdated(answer, _round, block.timestamp);
    }
}
