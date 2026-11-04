import "dotenv/config";
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

  const dai = AAVE_SEPOLIA_DAI;
  const aDai = AAVE_SEPOLIA_ADAI;
  const supplyAmount = parseUnits("10", 18); // 10 DAI

  console.log(`\n─── Step 1: Checking User Balances & Allowance ───`);
  const metadata = await client.getAssetMetadata(dai, userAddress);
  const aDaiBalance = await client.client.readContract({
    address: aDai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  console.log(`User Address:      ${userAddress}`);
  console.log(`DAI Balance:       ${formatUnits(metadata.userBalance, metadata.decimals)} DAI`);
  console.log(`aDAI Balance:      ${formatUnits(aDaiBalance, 18)} aDAI`);
  console.log(`Current Allowance: ${formatUnits(metadata.userAllowance, metadata.decimals)} DAI for Pool`);

  console.log(`\n─── Step 2: Running Supply Preflight ───`);
  const preflight = await runSupplyPreflight(client, {
    user: userAddress,
    asset: dai,
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

    console.log(`Submitting approve(pool, 10 DAI)...`);
    const approveTx = await walletClient.writeContract({
      address: dai,
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
      asset: dai,
      amount: supplyAmount.toString(),
    });
    console.log(`Re-preflight Status:  ${rePreflight.status}`);
    console.log(`Approval Required:    ${rePreflight.approvalRequired}`);
    console.log(`Estimated Gas:        ${rePreflight.gasEstimate}`);

    console.log(`\n─── Step 5: Submitting Supply Onchain ───`);
    console.log(`Submitting supply(DAI, 10, user, 0)...`);
    const supplyTx = await walletClient.writeContract({
      address: poolAddress,
      abi: aavePoolAbi,
      functionName: "supply",
      args: [dai, supplyAmount, userAddress, 0],
    });
    console.log(`Supply Tx Broadcasted: https://sepolia.etherscan.io/tx/${supplyTx}`);
    console.log(`Waiting for receipt...`);
    const supplyReceipt = await client.client.waitForTransactionReceipt({
      hash: supplyTx,
    });
    console.log(`✓ Supply confirmed in block ${supplyReceipt.blockNumber} (Status: ${supplyReceipt.status})`);

    console.log(`\n─── Step 6: Verifying New aToken Balance ───`);
    const finalADai = await client.client.readContract({
      address: aDai,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress],
    });
    console.log(`Updated aDAI Balance: ${formatUnits(finalADai, 18)} aDAI`);
    console.log(`\n🎉 Task 3 Live Sepolia Supply Flow Complete!`);
  } else if (metadata.userAllowance >= supplyAmount) {
    console.log(`\n✓ Current allowance is sufficient (${formatUnits(metadata.userAllowance, metadata.decimals)} DAI).`);
    console.log(`Preflight passed with status: ${preflight.status}`);
  } else {
    console.log(`\n💡 To execute automated approve & supply, run with your burner private key:`);
    console.log(`   npx tsx packages/aave-adapter/src/run-live-sepolia-demo.ts 0x<YOUR_PRIVATE_KEY>`);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
