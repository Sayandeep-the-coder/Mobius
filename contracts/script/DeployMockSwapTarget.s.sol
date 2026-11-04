// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {Script, console2} from "forge-std/Script.sol";
import {MockSwapTarget} from "../src/MockSwapTarget.sol";

contract DeployMockSwapTarget is Script {
    function run() external returns (MockSwapTarget mockSwapTarget) {
        vm.startBroadcast();

        mockSwapTarget = new MockSwapTarget();

        console2.log("=== MockSwapTarget Deployed ===");
        console2.log("Contract Address:", address(mockSwapTarget));
        console2.log("Owner:           ", mockSwapTarget.owner());
        console2.log("Initial RateWad: ", mockSwapTarget.rateWad());
        console2.log("Chain ID:        ", block.chainid);

        vm.stopBroadcast();
    }
}
