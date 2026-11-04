// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

/// @notice Deterministic demo target for Mobius preflight testing.
/// @dev NOT a DEX and does NOT move tokens. It models a quote-dependent
///      execution condition so Mobius can demonstrate stale-quote detection.
contract MockSwapTarget {
    address public immutable owner;
    uint256 public rateWad = 1e18;
    uint256 public totalSimulatedOutput;

    error OnlyOwner();
    error InvalidRate();
    error InvalidAmount();
    error SlippageExceeded(uint256 actualOut, uint256 minOut);

    event RateUpdated(uint256 oldRate, uint256 newRate);
    event SimulatedSwap(address indexed trader, uint256 amountIn, uint256 amountOut, uint256 minOut);

    constructor() {
        owner = msg.sender;
    }

    function setRate(uint256 newRateWad) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newRateWad == 0) revert InvalidRate();
        uint256 oldRate = rateWad;
        rateWad = newRateWad;
        emit RateUpdated(oldRate, newRateWad);
    }

    function quote(uint256 amountIn) public view returns (uint256) {
        return (amountIn * rateWad) / 1e18;
    }

    function swap(uint256 amountIn, uint256 minOut) external returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        amountOut = quote(amountIn);
        if (amountOut < minOut) revert SlippageExceeded(amountOut, minOut);
        totalSimulatedOutput += amountOut;
        emit SimulatedSwap(msg.sender, amountIn, amountOut, minOut);
    }
}
