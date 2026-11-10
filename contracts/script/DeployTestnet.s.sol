// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WifTape} from "../src/WifTape.sol";
import {TestWif} from "../src/testnet/TestWif.sol";
import {TestFeed} from "../src/testnet/TestFeed.sol";

/// @notice Deploys the whole product to Robinhood Chain testnet: a test token, three test price feeds, WifTape with
///         three markets, and seeds the deployer with tWIF. Everything is free and has no value.
/// Env: PRIVATE_KEY (deployer, throwaway), PUSHER (address allowed to write prices, defaults to the deployer)
/// Run: forge script script/DeployTestnet.s.sol --rpc-url https://rpc.testnet.chain.robinhood.com --broadcast
contract DeployTestnet is Script {
    // Short rounds so a demo shows a full cycle: entries 2 min, round 5 min. Feeds are pushed every ~15s,
    // so a 90s freshness and settle window is comfortable.
    uint32 constant ENTRY_WINDOW = 2 minutes;
    uint32 constant DURATION = 5 minutes;
    uint32 constant MAX_STALENESS = 90;
    uint32 constant MAX_SETTLE_LAG = 90;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address pusher = vm.envOr("PUSHER", deployer);

        vm.startBroadcast(pk);
        TestWif wif = new TestWif(deployer);
        WifTape tape = new WifTape(address(wif), true, 1000, 1e18, deployer);

        TestFeed nvda = new TestFeed("NVDA / USD (test)", 140_00000000, pusher);
        TestFeed tsla = new TestFeed("TSLA / USD (test)", 250_00000000, pusher);
        TestFeed aapl = new TestFeed("AAPL / USD (test)", 230_00000000, pusher);

        tape.addMarket(address(nvda), "NVDA", ENTRY_WINDOW, DURATION, MAX_STALENESS, MAX_SETTLE_LAG, address(0));
        tape.addMarket(address(tsla), "TSLA", ENTRY_WINDOW, DURATION, MAX_STALENESS, MAX_SETTLE_LAG, address(0));
        tape.addMarket(address(aapl), "AAPL", ENTRY_WINDOW, DURATION, MAX_STALENESS, MAX_SETTLE_LAG, address(0));

        wif.mint(deployer, 1_000_000e18);
        vm.stopBroadcast();

        console.log("deployer   ", deployer);
        console.log("pusher     ", pusher);
        console.log("TestWif    ", address(wif));
        console.log("WifTape    ", address(tape));
        console.log("NVDA feed  ", address(nvda));
        console.log("TSLA feed  ", address(tsla));
        console.log("AAPL feed  ", address(aapl));
    }
}
