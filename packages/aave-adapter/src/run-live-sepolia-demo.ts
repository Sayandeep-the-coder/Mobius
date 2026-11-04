try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch {}
import {
  createWalletClient,
  formatUnits,
  parseUnits,
  type Address,
  erc20Abi,
  getAddress,
  isAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  AaveSepoliaClient,
  runSupplyPreflight,
} from "./index";
import {
  AAVE_SEPOLIA_DAI,
  AAVE_SEPOLIA_ADAI,
} from "./constants";
import { aavePoolAbi } from "./abis";

/**
 * Interactive / Automated Runner for Task 3: Live Onchain Sepolia Supply Execution
 *
 * Usage:
 *   npx tsx packages/aave-adapter/src/run-live-sepolia-demo.ts [optional-address-or-private-key]
 */
async function main() {
  console.log("===============================================================");
  console.log("  Mobius × Aave V3 Sepolia Live Supply & Preflight Runner");
  console.log("===============================================================\n");

  const rpcUrl =
    process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  console.log(`RPC URL:   ${rpcUrl}`);
  console.log(`Chain ID:  11155111 (Ethereum Sepolia)\n`);

  const client = new AaveSepoliaClient({ rpcUrl });
  const { poolAddress, blockNumber } = await client.resolvePool();
  console.log(`✓ PoolAddressesProvider resolved Pool to: ${poolAddress} (at block ${blockNumber})`);

  const rawArg = process.argv[2] || process.env.SEPOLIA_TEST_PRIVATE_KEY;
  let userAddress: Address;
  let account: ReturnType<typeof privateKeyToAccount> | undefined;

  if (rawArg && rawArg.startsWith("0x") && rawArg.length === 66) {
    account = privateKeyToAccount(rawArg as `0x${string}`);
    userAddress = account.address;
    console.log(`✓ Loaded signer account: ${userAddress}`);
  } else if (rawArg && isAddress(rawArg)) {
    userAddress = getAddress(rawArg);
    console.log(`✓ Using target address (read-only mode): ${userAddress}`);
  } else {
    console.log("ℹ No private key or address provided.");
    console.log("  Pass a wallet address or private key as argument:");
    console.log("    npx tsx packages/aave-adapter/src/run-live-sepolia-demo.ts <ADDRESS_OR_PRIVATE_KEY>\n");
    console.log("  Defaulting to test inspection on verified Sepolia DAI reserve...");
    userAddress = getAddress("0x0000000000000000000000000000000000000001");
  }

  const isLink = process.argv.includes("--link") || process.argv.includes("--asset=link");
  const assetAddress = isLink
    ? ("0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5" as const) // LINK
    : AAVE_SEPOLIA_DAI;
  const aTokenAddress = isLink
    ? ("0x3FfAf50D4F4E96eB78f2407c090b72e86eCaed24" as const) // aLINK
    : AAVE_SEPOLIA_ADAI;
  const assetSymbol = isLink ? "LINK" : "DAI";
  const supplyAmount = parseUnits("5", 18); // 5 tokens

  console.log(`\n─── Step 1: Checking User Balances & Allowance ───`);
  const metadata = await client.getAssetMetadata(assetAddress, userAddress);
  const aTokenBalance = await client.client.readContract({
    address: aTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  console.log(`User Address:      ${userAddress}`);
  console.log(`Asset:             ${assetSymbol} (${assetAddress})`);
  console.log(`Balance:           ${formatUnits(metadata.userBalance, metadata.decimals)} ${assetSymbol}`);
  console.log(`aToken Balance:    ${formatUnits(aTokenBalance, 18)} a${assetSymbol}`);
  console.log(`Current Allowance: ${formatUnits(metadata.userAllowance, metadata.decimals)} ${assetSymbol} for Pool`);

  // If using LINK and balance is insufficient, auto-mint from faucet
  if (isLink && account && metadata.userBalance < supplyAmount) {
    console.log(`\n─── Auto-funding 10 LINK from Aave Sepolia Faucet ───`);
    const faucetAddress = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D" as const;
    const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
    const mintTx = await walletClient.writeContract({
      address: faucetAddress,
      abi: [
        {
          name: "mint",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "token", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "mint",
      args: [assetAddress, userAddress, parseUnits("10", 18)],
    });
    console.log(`Faucet Mint Tx:    https://sepolia.etherscan.io/tx/${mintTx}`);
    await client.client.waitForTransactionReceipt({ hash: mintTx });
    console.log(`✓ 10 LINK received from Faucet!`);
  }

  console.log(`\n─── Step 2: Running Supply Preflight ───`);
  const preflight = await runSupplyPreflight(client, {
    user: userAddress,
    asset: assetAddress,
    amount: supplyAmount.toString(),
  });

  console.log(`Preflight Status:  ${preflight.status}`);
  console.log(`Approval Required: ${preflight.approvalRequired}`);
  if (preflight.warnings) {
    console.log(`Warnings:\n  ${preflight.warnings.join("\n  ")}`);
  }

  if (account && metadata.userAllowance < supplyAmount) {
    console.log(`\n─── Step 3: Allowance Insufficient -> Submitting Approval Onchain ───`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    console.log(`Submitting approve(pool, 5 ${assetSymbol})...`);
    const approveTx = await walletClient.writeContract({
      address: assetAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [poolAddress, supplyAmount],
    });
    console.log(`Approval Tx Broadcasted: https://sepolia.etherscan.io/tx/${approveTx}`);
    console.log(`Waiting for receipt...`);
    const approveReceipt = await client.client.waitForTransactionReceipt({
      hash: approveTx,
    });
    console.log(`✓ Approval confirmed in block ${approveReceipt.blockNumber} (Status: ${approveReceipt.status})`);

    console.log(`\n─── Step 4: Re-running Preflight With Allowance Granted ───`);
    const rePreflight = await runSupplyPreflight(client, {
      user: userAddress,
      asset: assetAddress,
      amount: supplyAmount.toString(),
    });
    console.log(`Re-preflight Status:  ${rePreflight.status}`);
    console.log(`Approval Required:    ${rePreflight.approvalRequired}`);
    console.log(`Estimated Gas:        ${rePreflight.gasEstimate}`);

    if (rePreflight.status === "SIMULATION_REVERTED") {
      console.log(`\n⚠️ MOBIUS DEFENSE ACTIVATED:`);
      console.log(`  Simulation reverted onchain: ${rePreflight.reason || "Error 51: SUPPLY_CAP_EXCEEDED"}`);
      console.log(`  Mobius refuses to broadcast an unsafe transaction, saving your gas!`);
      console.log(`  Tip: Try running with LINK (which has open supply cap):`);
      console.log(`    npx tsx packages/aave-adapter/src/run-live-sepolia-demo.ts <KEY> --link\n`);
      return;
    }

    console.log(`\n─── Step 5: Submitting Supply Onchain ───`);
    console.log(`Submitting supply(${assetSymbol}, 5, user, 0)...`);
    const supplyTx = await walletClient.writeContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "supply",
      args: [assetAddress, supplyAmount, userAddress, 0],
    });
    console.log(`Supply Tx Broadcasted: https://sepolia.etherscan.io/tx/${supplyTx}`);
    console.log(`Waiting for receipt...`);
    const supplyReceipt = await client.client.waitForTransactionReceipt({
      hash: supplyTx,
    });
    console.log(`✓ Supply confirmed in block ${supplyReceipt.blockNumber} (Status: ${supplyReceipt.status})`);

    console.log(`\n─── Step 6: Verifying New aToken Balance ───`);
    const finalAToken = await client.client.readContract({
      address: aTokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress],
    });
    console.log(`Updated a${assetSymbol} Balance: ${formatUnits(finalAToken, 18)} a${assetSymbol}`);
    console.log(`\n🎉 Task 3 Live Sepolia Supply Flow Complete!`);
  } else if (metadata.userAllowance >= supplyAmount) {
    console.log(`\n✓ Current allowance is sufficient (${formatUnits(metadata.userAllowance, metadata.decimals)} ${assetSymbol}).`);
    console.log(`Preflight passed with status: ${preflight.status}`);
    if (preflight.status === "SIMULATION_PASSED" && account) {
      console.log(`\n─── Step 5: Submitting Supply Onchain ───`);
      const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
      const supplyTx = await walletClient.writeContract({
        address: poolAddress,
        abi: aavePoolAbi,
        functionName: "supply",
        args: [assetAddress, supplyAmount, userAddress, 0],
      });
      console.log(`Supply Tx Broadcasted: https://sepolia.etherscan.io/tx/${supplyTx}`);
      const supplyReceipt = await client.client.waitForTransactionReceipt({ hash: supplyTx });
      console.log(`✓ Supply confirmed in block ${supplyReceipt.blockNumber} (Status: ${supplyReceipt.status})`);

      const finalAToken = await client.client.readContract({
        address: aTokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [userAddress],
      });
      console.log(`Updated a${assetSymbol} Balance: ${formatUnits(finalAToken, 18)} a${assetSymbol}`);
      console.log(`\n🎉 Task 3 Live Sepolia Supply Flow Complete!`);
    }
  } else {
    console.log(`\n💡 To execute automated approve & supply, run with your burner private key:`);
    console.log(`   npx tsx packages/aave-adapter/src/run-live-sepolia-demo.ts 0x<YOUR_PRIVATE_KEY>`);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
