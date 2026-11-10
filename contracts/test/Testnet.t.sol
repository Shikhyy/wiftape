// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {WifTape} from "../src/WifTape.sol";
import {TestWif} from "../src/testnet/TestWif.sol";
import {TestFeed} from "../src/testnet/TestFeed.sol";

/// @dev Checks the testnet-only contracts, and that WifTape runs a full round against them exactly as it does on mainnet.
contract TestnetTest is Test {
    TestWif wif;
    TestFeed feed;
    WifTape tape;
    address owner = address(0xA11CE);
    address pusher = address(0xB0B);
    address alice = address(0xA1);
    address bob = address(0xB2);

    function setUp() public {
        vm.warp(1_700_000_000);
        wif = new TestWif(owner);
        feed = new TestFeed("NVDA / USD (test)", 140e8, pusher);
        tape = new WifTape(address(wif), true, 1000, 1e18, owner);
        vm.prank(owner);
        tape.addMarket(address(feed), "NVDA", 2 minutes, 5 minutes, 90, 90, address(0));
    }

    function test_faucet_givesTokensThenCoolsDown() public {
        vm.prank(alice);
        wif.faucet();
        assertEq(wif.balanceOf(alice), 1_000e18);
        vm.prank(alice);
        vm.expectRevert("FAUCET_COOLDOWN");
        wif.faucet();
        vm.warp(block.timestamp + 10 minutes);
        vm.prank(alice);
        wif.faucet();
        assertEq(wif.balanceOf(alice), 2_000e18);
    }

    function test_mint_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        wif.mint(alice, 1);
    }

    function test_burn_reducesSupply() public {
        vm.prank(alice);
        wif.faucet();
        vm.prank(alice);
        wif.burn(100e18);
        assertEq(wif.totalSupply(), 900e18);
    }

    function test_feed_onlyPusherCanPush() public {
        vm.expectRevert("NOT_PUSHER");
        feed.push(141e8);
        vm.prank(pusher);
        feed.push(141e8);
        (, int256 a,, uint256 u,) = feed.latestRoundData();
        assertEq(a, 141e8);
        assertEq(u, block.timestamp);
    }

    function test_fullRound_againstTestContracts() public {
        vm.prank(alice);
        wif.faucet();
        vm.prank(bob);
        wif.faucet();
        vm.prank(alice);
        wif.approve(address(tape), type(uint256).max);
        vm.prank(bob);
        wif.approve(address(tape), type(uint256).max);

        uint256 id = tape.openRound(0);
        vm.prank(alice);
        tape.enter(id, WifTape.Side.Up, 100e18, address(0));
        vm.prank(bob);
        tape.enter(id, WifTape.Side.Down, 50e18, address(0));

        vm.warp(block.timestamp + 5 minutes + 1);
        vm.prank(pusher);
        feed.push(145e8);
        tape.settle(id);

        assertEq(tape.totalBurned(), 5e18); // 10% of the 50 losing pool, really burned
        assertEq(wif.totalSupply(), 2_000e18 - 5e18);
        vm.prank(alice);
        assertEq(tape.claim(id), 145e18);
    }
}
