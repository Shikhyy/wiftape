// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {WifTape} from "../src/WifTape.sol";
import {MockWif, MockFeed, MockStockToken} from "./Mocks.sol";

contract WifTapeTest is Test {
    WifTape tape;
    MockWif wif;
    MockFeed feed;

    address owner = address(0xA11CE);
    address alice = address(0xA1);
    address bob = address(0xB0);
    address carol = address(0xC0);

    uint256 constant ONE = 1e18;
    uint32 constant ENTRY = 10 minutes;
    uint32 constant DURATION = 1 hours;

    function setUp() public {
        vm.warp(1_700_000_000);
        wif = new MockWif();
        feed = new MockFeed(100e8);
        tape = new WifTape(address(wif), true, 1000, ONE, owner); // 10% burn, 1 WIF min
        vm.prank(owner);
        tape.addMarket(address(feed), "NVDA", ENTRY, DURATION, 30 minutes, 30 minutes, address(0));

        address[3] memory users = [alice, bob, carol];
        for (uint256 i; i < users.length; i++) {
            wif.mint(users[i], 1_000 * ONE);
            vm.prank(users[i]);
            wif.approve(address(tape), type(uint256).max);
        }
    }

    // ---------------------------------------------------------------- helpers

    function _enter(address who, uint256 id, WifTape.Side side, uint256 amt) internal {
        vm.prank(who);
        tape.enter(id, side, amt, address(0));
    }

    function _endAndPrice(uint256 id, int256 price) internal {
        WifTape.Round memory r = tape.getRound(id);
        vm.warp(r.endTime + 1);
        feed.setAnswer(price);
        tape.settle(id);
    }

    function _round(int256 closePrice, uint256 upAmt, uint256 downAmt) internal returns (uint256 id) {
        id = tape.openRound(0);
        if (upAmt > 0) _enter(alice, id, WifTape.Side.Up, upAmt);
        if (downAmt > 0) _enter(bob, id, WifTape.Side.Down, downAmt);
        _endAndPrice(id, closePrice);
    }

    function _streak(address who) internal view returns (uint32 s) {
        (s,,,,,,,,) = tape.players(who);
    }

    function _shields(address who) internal view returns (uint8 s) {
        (,,,, s,,,,) = tape.players(who);
    }

    // ------------------------------------------------------------------ tests

    function test_openRound_recordsPriceAndWindows() public {
        uint256 id = tape.openRound(0);
        WifTape.Round memory r = tape.getRound(id);
        assertEq(uint8(r.status), uint8(WifTape.Status.Open));
        assertEq(r.openPrice, 100e8);
        assertEq(r.lockTime, block.timestamp + ENTRY);
        assertEq(r.endTime, block.timestamp + DURATION);
    }

    function test_openRound_revertsWhileRoundActive() public {
        tape.openRound(0);
        vm.expectRevert("ROUND_ACTIVE");
        tape.openRound(0);
    }

    function test_openRound_revertsOnStalePrice() public {
        vm.warp(block.timestamp + 31 minutes);
        vm.expectRevert("STALE_PRICE");
        tape.openRound(0);
    }

    function test_enter_belowMinReverts() public {
        uint256 id = tape.openRound(0);
        vm.prank(alice);
        vm.expectRevert("BELOW_MIN");
        tape.enter(id, WifTape.Side.Up, ONE - 1, address(0));
    }

    function test_enter_afterLockReverts() public {
        uint256 id = tape.openRound(0);
        vm.warp(block.timestamp + ENTRY);
        vm.prank(alice);
        vm.expectRevert("ENTRY_CLOSED");
        tape.enter(id, WifTape.Side.Up, ONE, address(0));
    }

    function test_enter_cannotSwitchSides() public {
        uint256 id = tape.openRound(0);
        _enter(alice, id, WifTape.Side.Up, 5 * ONE);
        vm.prank(alice);
        vm.expectRevert("OTHER_SIDE");
        tape.enter(id, WifTape.Side.Down, ONE, address(0));
    }

    function test_settle_upWins_burnsTenPercentOfLosingPool() public {
        uint256 id = _round(110e8, 100 * ONE, 50 * ONE);
        WifTape.Round memory r = tape.getRound(id);
        assertEq(uint8(r.status), uint8(WifTape.Status.Settled));
        assertEq(uint8(r.winner), uint8(WifTape.Side.Up));
        assertEq(r.burned, 5 * ONE); // 10% of 50
        assertEq(tape.totalBurned(), 5 * ONE);
        assertEq(wif.totalSupply(), 3_000 * ONE - 5 * ONE); // burn() reduced supply
    }

    function test_claim_winnerGetsStakePlusNetLosersPool() public {
        uint256 id = _round(110e8, 100 * ONE, 50 * ONE);
        uint256 before = wif.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = tape.claim(id);
        assertEq(payout, 100 * ONE + 45 * ONE); // stake + (50 - 5)
        assertEq(wif.balanceOf(alice), before + payout);
    }

    function test_claim_loserGetsNothing() public {
        uint256 id = _round(110e8, 100 * ONE, 50 * ONE);
        vm.prank(bob);
        assertEq(tape.claim(id), 0);
    }

    function test_claim_twiceReverts() public {
        uint256 id = _round(110e8, 100 * ONE, 50 * ONE);
        vm.startPrank(alice);
        tape.claim(id);
        vm.expectRevert("NOTHING_TO_CLAIM");
        tape.claim(id);
        vm.stopPrank();
    }

    function test_tie_voidsAndRefunds() public {
        uint256 id = _round(100e8, 100 * ONE, 50 * ONE);
        assertEq(uint8(tape.getRound(id).status), uint8(WifTape.Status.Void));
        vm.prank(alice);
        assertEq(tape.claim(id), 100 * ONE);
        vm.prank(bob);
        assertEq(tape.claim(id), 50 * ONE);
        assertEq(tape.totalBurned(), 0);
    }

    function test_oneSided_voidsAndRefunds() public {
        uint256 id = _round(120e8, 100 * ONE, 0);
        assertEq(uint8(tape.getRound(id).status), uint8(WifTape.Status.Void));
        vm.prank(alice);
        assertEq(tape.claim(id), 100 * ONE);
    }

    function test_settle_beforeEndReverts() public {
        uint256 id = tape.openRound(0);
        vm.expectRevert("NOT_ENDED");
        tape.settle(id);
    }

    function test_settle_requiresFreshPostEndPrice() public {
        uint256 id = tape.openRound(0);
        _enter(alice, id, WifTape.Side.Up, ONE);
        _enter(bob, id, WifTape.Side.Down, ONE);
        vm.warp(tape.getRound(id).endTime + 1);
        vm.expectRevert("NO_VALID_PRICE"); // feed was last updated before the end
        tape.settle(id);
    }

    function test_voidRound_afterGraceRefunds() public {
        uint256 id = tape.openRound(0);
        _enter(alice, id, WifTape.Side.Up, 10 * ONE);
        _enter(bob, id, WifTape.Side.Down, 10 * ONE);

        vm.warp(tape.getRound(id).endTime + 30 minutes);
        vm.expectRevert("TOO_EARLY");
        tape.voidRound(id);

        vm.warp(tape.getRound(id).endTime + 30 minutes + 1 hours);
        tape.voidRound(id);

        vm.prank(alice);
        assertEq(tape.claim(id), 10 * ONE);
        vm.prank(bob);
        assertEq(tape.claim(id), 10 * ONE);
    }

    function test_streak_buildsOnWins_resetsOnLoss() public {
        uint256 r1 = _round(110e8, 10 * ONE, 10 * ONE);
        vm.prank(alice);
        tape.claim(r1);
        assertEq(_streak(alice), 1);

        uint256 r2 = tape.openRound(0);
        _enter(alice, r2, WifTape.Side.Up, 10 * ONE);
        _enter(bob, r2, WifTape.Side.Down, 10 * ONE);
        _endAndPrice(r2, 120e8);
        vm.prank(alice);
        tape.claim(r2);
        assertEq(_streak(alice), 2);

        uint256 r3 = tape.openRound(0);
        _enter(alice, r3, WifTape.Side.Up, 10 * ONE);
        _enter(bob, r3, WifTape.Side.Down, 10 * ONE);
        _endAndPrice(r3, 90e8);
        vm.prank(alice);
        tape.claim(r3);
        assertEq(_streak(alice), 0);
    }

    function test_streak_losersCannotSkipClaimToKeepStreak() public {
        uint256 r1 = _round(110e8, 10 * ONE, 10 * ONE);
        vm.prank(alice);
        tape.claim(r1); // streak = 1

        uint256 r2 = tape.openRound(0);
        _enter(alice, r2, WifTape.Side.Up, 10 * ONE);
        _enter(bob, r2, WifTape.Side.Down, 10 * ONE);
        _endAndPrice(r2, 90e8); // alice loses and never claims

        uint256 r3 = tape.openRound(0);
        _enter(alice, r3, WifTape.Side.Up, 10 * ONE); // folds the loss first
        assertEq(_streak(alice), 0);
    }

    function test_enter_blockedWhilePreviousRoundUnresolved() public {
        MockFeed feed2 = new MockFeed(50e8);
        vm.prank(owner);
        tape.addMarket(address(feed2), "TSLA", ENTRY, DURATION, 30 minutes, 30 minutes, address(0));
        uint256 a = tape.openRound(0);
        uint256 b = tape.openRound(1);
        _enter(alice, a, WifTape.Side.Up, ONE);
        vm.prank(alice);
        vm.expectRevert("PREV_UNRESOLVED");
        tape.enter(b, WifTape.Side.Up, ONE, address(0));
    }

    function test_streakBonus_shiftsPayoutToStreakHolder() public {
        for (uint256 i; i < 2; i++) {
            uint256 r = tape.openRound(0);
            _enter(alice, r, WifTape.Side.Up, ONE);
            _enter(bob, r, WifTape.Side.Down, ONE);
            _endAndPrice(r, int256(100e8) + int256(i + 1) * 1e8);
            vm.prank(alice);
            tape.claim(r);
            vm.prank(bob);
            tape.claim(r);
        }
        uint256 id = tape.openRound(0);
        _enter(alice, id, WifTape.Side.Up, 100 * ONE); // weight 1.10x
        _enter(carol, id, WifTape.Side.Up, 100 * ONE); // weight 1.00x
        _enter(bob, id, WifTape.Side.Down, 100 * ONE);
        _endAndPrice(id, 200e8);

        vm.prank(alice);
        uint256 a = tape.claim(id);
        vm.prank(carol);
        uint256 c = tape.claim(id);
        assertGt(a, c);
    }

    function test_referral_paysShieldAfterFirstFinishedRound() public {
        uint256 r1 = tape.openRound(0);
        vm.prank(bob);
        tape.enter(r1, WifTape.Side.Down, 10 * ONE, alice); // alice refers bob
        _enter(carol, r1, WifTape.Side.Up, 10 * ONE);
        _endAndPrice(r1, 90e8);
        vm.prank(bob);
        tape.claim(r1);
        assertEq(_shields(alice), 1);
    }

    function test_owner_hasNoWithdrawPath() public {
        uint256 id = tape.openRound(0);
        _enter(alice, id, WifTape.Side.Up, 10 * ONE);
        vm.prank(owner);
        (bool ok,) = address(tape).call(abi.encodeWithSignature("withdraw(address,uint256)", owner, 10 * ONE));
        assertFalse(ok);
        assertEq(wif.balanceOf(address(tape)), 10 * ONE);
    }

    function test_onlyOwnerCanAddMarket() public {
        vm.prank(alice);
        vm.expectRevert("NOT_OWNER");
        tape.addMarket(address(feed), "X", ENTRY, DURATION, 1, 1, address(0));
    }

    function test_burnToDead_whenTokenHasNoBurn() public {
        WifTape t2 = new WifTape(address(wif), false, 1000, ONE, owner);
        vm.prank(owner);
        t2.addMarket(address(feed), "NVDA", ENTRY, DURATION, 30 minutes, 30 minutes, address(0));
        vm.prank(alice);
        wif.approve(address(t2), type(uint256).max);
        vm.prank(bob);
        wif.approve(address(t2), type(uint256).max);

        uint256 id = t2.openRound(0);
        vm.prank(alice);
        t2.enter(id, WifTape.Side.Up, 100 * ONE, address(0));
        vm.prank(bob);
        t2.enter(id, WifTape.Side.Down, 100 * ONE, address(0));
        vm.warp(t2.getRound(id).endTime + 1);
        feed.setAnswer(150e8);
        t2.settle(id);
        assertEq(wif.balanceOf(t2.DEAD()), 10 * ONE);
    }

    // ------------------------------------------------ Stock Token guard

    function _guarded() internal returns (MockStockToken tok, uint256 marketId) {
        tok = new MockStockToken();
        vm.prank(owner);
        marketId = tape.addMarket(address(feed), "NVDA-G", ENTRY, DURATION, 30 minutes, 30 minutes, address(tok));
    }

    function test_guard_openRevertsWhileOraclePaused_thenRecordsMultiplier() public {
        (MockStockToken tok, uint256 m) = _guarded();
        tok.setPaused(true);
        vm.expectRevert("ORACLE_PAUSED");
        tape.openRound(m);

        tok.setPaused(false);
        tok.setMultiplier(1_000_775_159_164_630_595); // the real NVDA value seen on-chain
        uint256 id = tape.openRound(m);
        assertEq(tape.openMultiplier(id), 1_000_775_159_164_630_595);
    }

    function test_guard_settleRevertsWhilePaused_thenSettlesWhenResumed() public {
        (MockStockToken tok, uint256 m) = _guarded();
        uint256 id = tape.openRound(m);
        _enter(alice, id, WifTape.Side.Up, 10 * ONE);
        _enter(bob, id, WifTape.Side.Down, 10 * ONE);
        vm.warp(tape.getRound(id).endTime + 1);
        feed.setAnswer(120e8);

        tok.setPaused(true);
        vm.expectRevert("ORACLE_PAUSED");
        tape.settle(id);

        tok.setPaused(false);
        tape.settle(id);
        assertEq(uint8(tape.getRound(id).status), uint8(WifTape.Status.Settled));
    }

    function test_guard_multiplierChangeVoidsAndRefunds() public {
        (MockStockToken tok, uint256 m) = _guarded();
        uint256 id = tape.openRound(m);
        _enter(alice, id, WifTape.Side.Up, 10 * ONE);
        _enter(bob, id, WifTape.Side.Down, 20 * ONE);

        tok.setMultiplier(1.01e18); // a corporate action lands mid-round
        vm.warp(tape.getRound(id).endTime + 1);
        feed.setAnswer(150e8); // would have been a clear Up win
        tape.settle(id);

        assertEq(uint8(tape.getRound(id).status), uint8(WifTape.Status.Void));
        assertEq(tape.totalBurned(), 0);
        vm.prank(alice);
        assertEq(tape.claim(id), 10 * ONE);
        vm.prank(bob);
        assertEq(tape.claim(id), 20 * ONE);
    }

    function test_guard_voidRoundStillWorksWhilePaused() public {
        (MockStockToken tok, uint256 m) = _guarded();
        uint256 id = tape.openRound(m);
        _enter(alice, id, WifTape.Side.Up, 10 * ONE);
        _enter(bob, id, WifTape.Side.Down, 10 * ONE);

        tok.setPaused(true);
        vm.warp(tape.getRound(id).endTime + 30 minutes + 1 hours);
        tape.voidRound(id); // paused oracle must never trap player funds

        vm.prank(alice);
        assertEq(tape.claim(id), 10 * ONE);
    }

    function test_guard_unguardedMarketIgnoresPausedTokens() public {
        // Market 0 has no stock token, so a paused token elsewhere has no effect on it.
        (MockStockToken tok,) = _guarded();
        tok.setPaused(true);
        uint256 id = tape.openRound(0);
        assertEq(tape.openMultiplier(id), 0);
    }

    /// @dev Solvency: payouts plus burn never exceed the round's pool.
    function testFuzz_payoutsNeverExceedPool(uint96 upA, uint96 downA, uint96 carolA) public {
        upA = uint96(bound(upA, ONE, 500 * ONE));
        downA = uint96(bound(downA, ONE, 500 * ONE));
        carolA = uint96(bound(carolA, ONE, 500 * ONE));

        uint256 id = tape.openRound(0);
        _enter(alice, id, WifTape.Side.Up, upA);
        _enter(carol, id, WifTape.Side.Up, carolA);
        _enter(bob, id, WifTape.Side.Down, downA);
        uint256 pool = uint256(upA) + carolA + downA;
        _endAndPrice(id, 130e8);

        uint256 paid;
        vm.prank(alice);
        paid += tape.claim(id);
        vm.prank(carol);
        paid += tape.claim(id);
        vm.prank(bob);
        paid += tape.claim(id);

        assertLe(paid + tape.getRound(id).burned, pool);
    }
}
