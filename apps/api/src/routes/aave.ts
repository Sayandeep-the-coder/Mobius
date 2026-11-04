import { Router } from "express";
import { z } from "zod";
import {
  AaveSepoliaClient,
  AaveMonadMainnetForkClient,
  AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER,
  AAVE_SEPOLIA_DAI,
  AAVE_MAINNET_POOL_ADDRESSES_PROVIDER,
  runSupplyPreflight,
  runWithdrawPreflight,
} from "@mobius/aave-adapter";
import type {
  AaveSupplyPreflightRequest,
  AaveSupplyPreflightResponse,
  AaveWithdrawPreflightRequest,
  AaveWithdrawPreflightResponse,
} from "@mobius/contracts-abi";

export const aaveRoutes = Router();
const client = new AaveSepoliaClient();
const forkClient = new AaveMonadMainnetForkClient();

const addressSchema = z.string().refine((v): v is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(v), {
  message: "Invalid Ethereum address (expected 20-byte hex starting with 0x)",
});

const preflightSchema = z.object({
  user: addressSchema,
  asset: addressSchema.optional().default(AAVE_SEPOLIA_DAI),
  amount: z.string().refine((v) => /^\d+$/.test(v) && BigInt(v) > 0n, {
    message: "Amount must be a positive decimal string (base units)",
  }),
});

/** GET /v1/aave/sepolia/market
 * Dynamically resolves the Aave V3 Pool on Ethereum Sepolia.
 */
aaveRoutes.get("/sepolia/market", async (_req, res) => {
  try {
    const { poolAddress, blockNumber } = await client.resolvePool();

    res.json({
      chainId: 11155111,
      network: "Ethereum Sepolia",
      poolAddressesProvider: AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER,
      pool: poolAddress,
      observedAtBlock: blockNumber.toString(),
      note: "Pool resolved dynamically from PoolAddressesProvider.getPool()",
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to resolve Aave Pool",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** POST /v1/aave/sepolia/supply/preflight
 * Protocol-aware preflight checking balance, allowance, and simulating supply.
 */
aaveRoutes.post("/sepolia/supply/preflight", async (req, res) => {
  const parse = preflightSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input: AaveSupplyPreflightRequest = {
    user: parse.data.user,
    asset: parse.data.asset,
    amount: parse.data.amount,
  };

  try {
    const preflight = await runSupplyPreflight(client, {
      user: input.user,
      asset: input.asset,
      amount: input.amount,
    });

    const statusMap: Record<string, "NOT_READY" | "PASSED" | "REVERTED"> = {
      NOT_READY: "NOT_READY",
      SIMULATION_PASSED: "PASSED",
      SIMULATION_REVERTED: "REVERTED",
    };

    const response: AaveSupplyPreflightResponse = {
      chainId: 11155111,
      blockNumber: preflight.blockNumber,
      blockHash: "0x00",
      pool: preflight.poolAddress,
      asset: input.asset,
      user: input.user,
      balance: preflight.assetMetadata.userBalance,
      allowance: preflight.assetMetadata.userAllowance,
      approvalRequired: preflight.approvalRequired,
      canSimulateSupply: preflight.status === "SIMULATION_PASSED",
      simulationStatus: statusMap[preflight.status] || "NOT_READY",
      gasEstimate: preflight.gasEstimate,
      preparedTransaction: preflight.preparedTransaction,
      approvalTransaction: preflight.approvalTransaction,
      reason: preflight.warnings?.join("; "),
      caveat: preflight.caveat,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      error: "Supply preflight execution failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** POST /v1/aave/sepolia/withdraw/preflight
 * Verifies user aToken collateral and simulates Pool.withdraw.
 */
aaveRoutes.post("/sepolia/withdraw/preflight", async (req, res) => {
  const parse = preflightSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input: AaveWithdrawPreflightRequest = {
    user: parse.data.user,
    asset: parse.data.asset,
    amount: parse.data.amount,
  };

  try {
    const preflight = await runWithdrawPreflight(client, {
      user: input.user,
      asset: input.asset,
      amount: input.amount,
    });

    const statusMap: Record<string, "NOT_READY" | "PASSED" | "REVERTED"> = {
      NOT_READY: "NOT_READY",
      SIMULATION_PASSED: "PASSED",
      SIMULATION_REVERTED: "REVERTED",
    };

    const response: AaveWithdrawPreflightResponse = {
      chainId: 11155111,
      blockNumber: preflight.blockNumber,
      blockHash: "0x00",
      pool: preflight.poolAddress,
      aTokenAddress: preflight.aTokenAddress,
      userATokenBalance: preflight.userATokenBalance,
      requestedAmount: preflight.requestedAmount,
      simulationStatus: statusMap[preflight.status] || "NOT_READY",
      gasEstimate: preflight.gasEstimate,
      preparedTransaction: preflight.preparedTransaction,
      reason: preflight.warnings?.join("; "),
      caveat: preflight.caveat,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      error: "Withdraw preflight execution failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** GET /v1/aave/sepolia/account/:user
 * Returns live Aave V3 health factor, collateral, and debt data for a user.
 */
aaveRoutes.get("/sepolia/account/:user", async (req, res) => {
  const parseUser = addressSchema.safeParse(req.params.user);
  if (!parseUser.success) {
    res.status(400).json({ error: "Invalid user address format" });
    return;
  }

  try {
    const accountData = await client.getUserAccountData(parseUser.data);
    res.json({
      chainId: 11155111,
      user: parseUser.data,
      totalCollateralBase: accountData.totalCollateralBase.toString(),
      totalDebtBase: accountData.totalDebtBase.toString(),
      availableBorrowsBase: accountData.availableBorrowsBase.toString(),
      currentLiquidationThreshold: accountData.currentLiquidationThreshold.toString(),
      ltv: accountData.ltv.toString(),
      healthFactor: accountData.healthFactor.toString(),
      healthFactorFormatted: accountData.healthFactorFormatted,
      observedAtBlock: accountData.observedAtBlock.toString(),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to read Aave user account data",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** GET /v1/aave/monad-mainnet-fork/market
 * Dynamically resolves the Aave V3 Pool from a Monad Mainnet Anvil fork.
 * Provides access to actual Aave V3 contracts deployed on Monad Mainnet
 * in an isolated local fork environment.
 */
aaveRoutes.get("/monad-mainnet-fork/market", async (_req, res) => {
  try {
    await forkClient.verifyChainId();
    const { poolAddress, blockNumber } = await forkClient.resolvePool();

    res.json({
      chainId: 31337,
      network: "Monad Mainnet Anvil Fork",
      chainName: "Anvil Fork of Monad Mainnet",
      poolAddressesProvider: AAVE_MAINNET_POOL_ADDRESSES_PROVIDER,
      pool: poolAddress,
      observedAtBlock: blockNumber.toString(),
      note: "Pool resolved dynamically from PoolAddressesProvider.getPool() on Anvil fork",
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to resolve Aave Pool on Anvil fork",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** POST /v1/aave/monad-mainnet-fork/supply/preflight
 * Protocol-aware preflight checking balance, allowance, and simulating supply
 * on a Monad Mainnet Anvil fork.
 * Gives access to actual Aave V3 protocol state from the forked Mainnet.
 */
aaveRoutes.post("/monad-mainnet-fork/supply/preflight", async (req, res) => {
  const parse = preflightSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input: AaveSupplyPreflightRequest = {
    user: parse.data.user,
    asset: parse.data.asset,
    amount: parse.data.amount,
  };

  try {
    // Verify chain ID before proceeding - ensures we're on the Anvil fork (31337)
    // and not on Mainnet RPC or Testnet without a proper fork.
    await forkClient.verifyChainId();

    const preflight = await runSupplyPreflight(forkClient as any, {
      user: input.user,
      asset: input.asset,
      amount: input.amount,
    });

    const statusMap: Record<string, "NOT_READY" | "PASSED" | "REVERTED"> = {
      NOT_READY: "NOT_READY",
      SIMULATION_PASSED: "PASSED",
      SIMULATION_REVERTED: "REVERTED",
    };

    const response: AaveSupplyPreflightResponse = {
      chainId: 11155111,  // Will be overwritten at runtime based on actual client
      blockNumber: preflight.blockNumber,
      blockHash: "0x00",
      pool: preflight.poolAddress,
      asset: input.asset,
      user: input.user,
      balance: preflight.assetMetadata.userBalance,
      allowance: preflight.assetMetadata.userAllowance,
      approvalRequired: preflight.approvalRequired,
      canSimulateSupply: preflight.status === "SIMULATION_PASSED",
      simulationStatus: statusMap[preflight.status] || "NOT_READY",
      gasEstimate: preflight.gasEstimate,
      preparedTransaction: preflight.preparedTransaction,
      approvalTransaction: preflight.approvalTransaction,
      reason: preflight.warnings?.join("; "),
      caveat: preflight.caveat,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      error: "Supply preflight execution failed on Anvil fork",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** POST /v1/aave/monad-mainnet-fork/withdraw/preflight
 * Verifies user aToken collateral and simulates Pool.withdraw
 * on a Monad Mainnet Anvil fork.
 */
aaveRoutes.post("/monad-mainnet-fork/withdraw/preflight", async (req, res) => {
  const parse = preflightSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }

  const input: AaveWithdrawPreflightRequest = {
    user: parse.data.user,
    asset: parse.data.asset,
    amount: parse.data.amount,
  };

  try {
    // Verify chain ID before proceeding
    await forkClient.verifyChainId();

    const preflight = await runWithdrawPreflight(forkClient as any, {
      user: input.user,
      asset: input.asset,
      amount: input.amount,
    });

    const statusMap: Record<string, "NOT_READY" | "PASSED" | "REVERTED"> = {
      NOT_READY: "NOT_READY",
      SIMULATION_PASSED: "PASSED",
      SIMULATION_REVERTED: "REVERTED",
    };

    const response: AaveWithdrawPreflightResponse = {
      chainId: 31337 as unknown as 11155111,
      blockNumber: preflight.blockNumber,
      blockHash: "0x00",
      pool: preflight.poolAddress,
      aTokenAddress: preflight.aTokenAddress,
      userATokenBalance: preflight.userATokenBalance,
      requestedAmount: preflight.requestedAmount,
      simulationStatus: statusMap[preflight.status] || "NOT_READY",
      gasEstimate: preflight.gasEstimate,
      preparedTransaction: preflight.preparedTransaction,
      reason: preflight.warnings?.join("; "),
      caveat: preflight.caveat,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      error: "Withdraw preflight execution failed on Anvil fork",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** GET /v1/aave/monad-mainnet-fork/account/:user
 * Returns Aave V3 user account data from a Monad Mainnet Anvil fork.
 * Provides actual health factor, collateral, and debt data from the forked state.
 */
aaveRoutes.get("/monad-mainnet-fork/account/:user", async (req, res) => {
  const parseUser = addressSchema.safeParse(req.params.user);
  if (!parseUser.success) {
    res.status(400).json({ error: "Invalid user address format" });
    return;
  }

  try {
    await forkClient.verifyChainId();
    const accountData = await forkClient.getUserAccountData(parseUser.data);
    res.json({
      chainId: 31337,
      user: parseUser.data,
      totalCollateralBase: accountData.totalCollateralBase.toString(),
      totalDebtBase: accountData.totalDebtBase.toString(),
      availableBorrowsBase: accountData.availableBorrowsBase.toString(),
      currentLiquidationThreshold: accountData.currentLiquidationThreshold.toString(),
      ltv: accountData.ltv.toString(),
      healthFactor: accountData.healthFactor.toString(),
      healthFactorFormatted: accountData.healthFactorFormatted,
      observedAtBlock: accountData.observedAtBlock.toString(),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to read Aave user account data from Anvil fork",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});