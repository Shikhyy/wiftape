// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WifTape} from "../src/WifTape.sol";

/// @notice Deploys WifTape and registers up to three markets.
/// Required env vars:  WIF_TOKEN, USE_BURN_FN (true/false), OWNER (the address that will own the contract; use the wallet you broadcast with)
/// Optional env vars:  FEED_NVDA, FEED_TSLA, FEED_AAPL (Chainlink feed addresses; skipped when unset)
///                     BURN_BPS (default 1000), MIN_STAKE (default 1e18)
/// Optional:           STOCK_NVDA, STOCK_TSLA, STOCK_AAPL (Stock Token addresses; enable the corporate-action guard)
/// Use the "(24/7)" Chainlink feeds for NVDA and TSLA: the plain /USD feeds were hours stale during market
/// hours, which would trip the 30 minute staleness limit below. Addresses are in docs/08-CHAIN-VERIFICATION.md.
/// Run: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
/// See docs/06-DEPLOYMENT-GUIDE.md before running on mainnet.
contract Deploy is Script {
    uint32 constant ENTRY_WINDOW = 10 minutes;
    uint32 constant DURATION = 1 hours;
    uint32 constant MAX_STALENESS = 30 minutes;
    uint32 constant MAX_SETTLE_LAG = 30 minutes;

    function run() external {
        address wifToken = vm.envAddress("WIF_TOKEN");
        bool useBurnFn = vm.envBool("USE_BURN_FN");
        uint16 burnBps = uint16(vm.envOr("BURN_BPS", uint256(1000)));
        uint256 minStake = vm.envOr("MIN_STAKE", uint256(1e18));

        // Do not use msg.sender here: inside a script's run() it is Foundry's default sender, not your wallet.
        address owner = vm.envAddress("OWNER");

        vm.startBroadcast();
        WifTape tape = new WifTape(wifToken, useBurnFn, burnBps, minStake, owner);
        _add(tape, "FEED_NVDA", "STOCK_NVDA", "NVDA");
        _add(tape, "FEED_TSLA", "STOCK_TSLA", "TSLA");
        _add(tape, "FEED_AAPL", "STOCK_AAPL", "AAPL");
        vm.stopBroadcast();

        console.log("WifTape deployed at", address(tape));
        console.log("markets registered", tape.marketsCount());
    }

    function _add(WifTape tape, string memory feedKey, string memory stockKey, string memory symbol) internal {
        address feed = vm.envOr(feedKey, address(0));
        if (feed == address(0)) return;
        // Optional: the Stock Token address turns on the corporate-action guard (oraclePaused + uiMultiplier).
        address stockToken = vm.envOr(stockKey, address(0));
        tape.addMarket(feed, symbol, ENTRY_WINDOW, DURATION, MAX_STALENESS, MAX_SETTLE_LAG, stockToken);
    }
}
