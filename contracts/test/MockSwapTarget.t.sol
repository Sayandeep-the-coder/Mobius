// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {Test, console2} from "forge-std/Test.sol";
import {MockSwapTarget} from "../src/MockSwapTarget.sol";

contract MockSwapTargetTest is Test {
    MockSwapTarget public target;
    address public owner;
    address public trader;
    address public attacker;

    event RateUpdated(uint256 oldRate, uint256 newRate);
    event SimulatedSwap(address indexed trader, uint256 amountIn, uint256 amountOut, uint256 minOut);

    function setUp() public {
        owner = address(this);
        trader = makeAddr("trader");
        attacker = makeAddr("attacker");

        target = new MockSwapTarget();
    }

    /* -------------------------------------------------------------------------- */
    /*                              1. Initial State                              */
    /* -------------------------------------------------------------------------- */

    function test_InitialState() public view {
        assertEq(target.owner(), owner, "Owner should be deployer");
        assertEq(target.rateWad(), 1e18, "Initial rate should be 1 WAD (1e18)");
        assertEq(target.totalSimulatedOutput(), 0, "Initial simulated output should be 0");
    }

    /* -------------------------------------------------------------------------- */
    /*                              2. Quote Behavior                             */
    /* -------------------------------------------------------------------------- */

    function test_QuoteDefaultRate() public view {
        uint256 amountIn = 100 ether;
        uint256 expectedOut = 100 ether; // 1:1 at 1e18
        assertEq(target.quote(amountIn), expectedOut, "Quote at 1e18 should be 1:1");
    }

    function test_QuoteUpdatedRate() public {
        // Change rate to 1.5 WAD (1.5e18)
        target.setRate(1.5e18);
        uint256 amountIn = 100 ether;
        assertEq(target.quote(amountIn), 150 ether, "Quote at 1.5e18 should be 150");

        // Change rate to 0.5 WAD (0.5e18)
        target.setRate(0.5e18);
        assertEq(target.quote(amountIn), 50 ether, "Quote at 0.5e18 should be 50");
    }

    /* -------------------------------------------------------------------------- */
    /*                           3. Rate Update & Access                          */
    /* -------------------------------------------------------------------------- */

    function test_SetRate_Success() public {
        uint256 newRate = 1.25e18;
        vm.expectEmit(false, false, false, true, address(target));
        emit RateUpdated(1e18, newRate);

        target.setRate(newRate);
        assertEq(target.rateWad(), newRate, "Rate should be updated");
    }

    function test_SetRate_RevertOnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert(MockSwapTarget.OnlyOwner.selector);
        target.setRate(2e18);
    }

    function test_SetRate_RevertInvalidRate() public {
        vm.expectRevert(MockSwapTarget.InvalidRate.selector);
        target.setRate(0);
    }

    /* -------------------------------------------------------------------------- */
    /*                               4. Swap Logic                                */
    /* -------------------------------------------------------------------------- */

    function test_Swap_Success() public {
        uint256 amountIn = 50 ether;
        uint256 minOut = 49 ether;

        vm.prank(trader);
        vm.expectEmit(true, false, false, true, address(target));
        emit SimulatedSwap(trader, amountIn, 50 ether, minOut);

        uint256 actualOut = target.swap(amountIn, minOut);

        assertEq(actualOut, 50 ether, "Amount out should match quote");
        assertEq(target.totalSimulatedOutput(), 50 ether, "Total output should increment");
    }

    function test_Swap_RevertInvalidAmount() public {
        vm.prank(trader);
        vm.expectRevert(MockSwapTarget.InvalidAmount.selector);
        target.swap(0, 0);
    }

    function test_Swap_RevertSlippageExceeded() public {
        uint256 amountIn = 100 ether;
        uint256 minOut = 101 ether; // impossible at 1e18

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(MockSwapTarget.SlippageExceeded.selector, 100 ether, minOut));
        target.swap(amountIn, minOut);
    }

    /* -------------------------------------------------------------------------- */
    /*                    5. Stale Quote Scenario (TOCTOU Demo)                   */
    /* -------------------------------------------------------------------------- */

    function test_StaleQuoteScenario() public {
        uint256 amountIn = 100 ether;

        // Step 1: Trader observes state at rate = 1e18
        uint256 initialQuote = target.quote(amountIn);
        assertEq(initialQuote, 100 ether);

        // Trader prepares tx with minOut = 100 ether based on initial quote
        uint256 plannedMinOut = 100 ether;

        // Step 2: Rate changes onchain to 0.8e18 (market moves / owner updates)
        target.setRate(0.8e18);

        // Step 3: Stale transaction executes against new state
        // Actual output is now 80 ether, which is less than minOut (100 ether)
        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(MockSwapTarget.SlippageExceeded.selector, 80 ether, plannedMinOut));
        target.swap(amountIn, plannedMinOut);

        // Step 4: After replanning with refreshed quote, new swap with appropriate minOut succeeds
        uint256 refreshedQuote = target.quote(amountIn);
        assertEq(refreshedQuote, 80 ether);

        vm.prank(trader);
        uint256 finalOut = target.swap(amountIn, 80 ether);
        assertEq(finalOut, 80 ether);
        assertEq(target.totalSimulatedOutput(), 80 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                         6. Sequential Swaps Accumulation                   */
    /* -------------------------------------------------------------------------- */

    function test_MultipleSequentialSwaps() public {
        vm.startPrank(trader);
        target.swap(10 ether, 10 ether);
        target.swap(25 ether, 25 ether);
        target.swap(65 ether, 65 ether);
        vm.stopPrank();

        assertEq(target.totalSimulatedOutput(), 100 ether, "Total output should sum all swaps");
    }

    /* -------------------------------------------------------------------------- */
    /*                             7. Fuzz Testing                                */
    /* -------------------------------------------------------------------------- */

    function testFuzz_Quote(uint256 amountIn, uint256 rateWad) public {
        // Bound inputs to avoid overflow: amountIn <= 1e28, rateWad between 1 and 1e24
        amountIn = bound(amountIn, 1, 1e28);
        rateWad = bound(rateWad, 1, 1e24);

        target.setRate(rateWad);
        uint256 expectedOut = (amountIn * rateWad) / 1e18;
        assertEq(target.quote(amountIn), expectedOut, "Fuzz quote calculation mismatch");
    }

    function testFuzz_Swap(uint256 amountIn, uint256 slippageBps) public {
        // Bound amountIn: 1e15 to 1e24
        amountIn = bound(amountIn, 1e15, 1e24);
        // Slippage tolerance: 0 to 10000 bps (0% to 100%)
        slippageBps = bound(slippageBps, 0, 10000);

        uint256 expectedOut = target.quote(amountIn);
        uint256 minOut = (expectedOut * (10000 - slippageBps)) / 10000;

        vm.prank(trader);
        uint256 actualOut = target.swap(amountIn, minOut);

        assertEq(actualOut, expectedOut);
        assertGe(actualOut, minOut);
    }
}
