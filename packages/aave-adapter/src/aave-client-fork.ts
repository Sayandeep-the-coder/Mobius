import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  isAddress,
  zeroAddress,
} from "viem";
import { mainnet } from "viem/chains";
import {
  MONAD_MAINNET_FORK_CHAIN_ID,
  AAVE_MAINNET_POOL_ADDRESSES_PROVIDER,
  DEFAULT_MONAD_MAINNET_RPC_URL,
} from "./constants.js";
import {
  poolAddressesProviderAbi,
  erc20Abi,
  aavePoolAbi,
  protocolDataProviderAbi,
} from "./abis.js";
import type { AssetMetadata, UserAccountData } from "./aave-client.js";

/**
 * Aave V3 Monad Mainnet Fork Client
 *
 * Connects to a local Anvil fork of Monad Mainnet (chainId: 31337).
 * This provides access to actual Aave V3 contracts deployed on Monad Mainnet
 * in an isolated local environment, as recommended by Aave's testing guide.
 *
 * Use case: Stateful Aave protocol simulations without touching Monad Testnet.
 * The fork must be started separately via Anvil (see integration-notes.md).
 */
export class AaveMonadMainnetForkClient {
  public readonly client: PublicClient;
  public readonly chainId: number;

  constructor(options?: { rpcUrl?: string; port?: number }) {
    const rpcUrl = options?.rpcUrl || process.env.MONAD_MAINNET_FORK_RPC_URL || DEFAULT_MONAD_MAINNET_RPC_URL;
    const port = options?.port ?? 8545;

    // The Anvil fork runs locally; we verify chain id after client creation
    this.client = createPublicClient({
      // We don't set a fixed chain here because the fork dynamically sets it,
      // but we use mainnet's native currency as a reference. The actual chainId
      // will be verified via verifyChainId().
      chain: mainnet,
      transport: http(`http://127.0.0.1:${port}`),
    });

    this.chainId = MONAD_MAINNET_FORK_CHAIN_ID;
  }

  /**
   * Asserts that connected RPC matches the expected Anvil fork chainId (31337).
   * Throws if the chainId mismatches, preventing accidental routing of Aave calls
   * to Mainnet or Testnet RPCs.
   */
  async verifyChainId(): Promise<number> {
    const chainId = await this.client.getChainId();
    if (chainId !== MONAD_MAINNET_FORK_CHAIN_ID) {
      throw new Error(
        `Chain mismatch: Expected Monad Mainnet Fork (${MONAD_MAINNET_FORK_CHAIN_ID}), got ${chainId}. ` +
          `Never route Aave calls to Mainnet RPCs or Testnet without an Anvil fork.`
      );
    }
    return chainId;
  }

  /**
   * Resolves the official Aave V3 Pool proxy dynamically from PoolAddressesProvider.
   * Verifies deployed bytecode to ensure contract exists at target address.
   * Since we're on a Monad Mainnet fork, this will return the Mainnet pool addresses.
   */
  async resolvePool(): Promise<{ poolAddress: Address; blockNumber: bigint }> {
    await this.verifyChainId();

    const blockNumber = await this.client.getBlockNumber();

    const pool = await this.client.readContract({
      address: AAVE_MAINNET_POOL_ADDRESSES_PROVIDER,
      abi: poolAddressesProviderAbi,
      functionName: "getPool",
    });

    if (!pool || pool === zeroAddress) {
      throw new Error(
        `Failed to resolve Pool: Provider ${AAVE_MAINNET_POOL_ADDRESSES_PROVIDER} returned zero address.`
      );
    }

    const code = await this.client.getCode({ address: pool });
    if (!code || code === "0x") {
      throw new Error(
        `Bytecode verification failed: Resolved Pool address ${pool} contains no deployed code.`
      );
    }

    return { poolAddress: pool, blockNumber };
  }

  /**
   * Reads token symbol, decimals, user balance, and user allowance for the Pool.
   */
  async getAssetMetadata(
    asset: Address,
    user: Address,
    poolAddress?: Address
  ): Promise<AssetMetadata> {
    if (!isAddress(asset) || asset === zeroAddress) {
      throw new Error(`Invalid asset address: ${asset}`);
    }
    if (!isAddress(user) || user === zeroAddress) {
      throw new Error(`Invalid user address: ${user}`);
    }

    const pool = poolAddress || (await this.resolvePool()).poolAddress;
    const blockNumber = await this.client.getBlockNumber();

    const [symbol, decimals, balance, allowance] = await Promise.all([
      this.client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      this.client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      this.client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [user],
      }),
      this.client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "allowance",
        args: [user, pool],
      }),
    ]);

    return {
      address: asset,
      symbol,
      decimals,
      userBalance: balance,
      userAllowance: allowance,
      observedAtBlock: blockNumber,
    };
  }

  /**
   * Queries getUserAccountData on the Pool contract.
   * Returns actual Aave V3 user account data from the forked Monad Mainnet state.
   */
  async getUserAccountData(
    user: Address,
    poolAddress?: Address
  ): Promise<UserAccountData> {
    if (!isAddress(user) || user === zeroAddress) {
      throw new Error(`Invalid user address: ${user}`);
    }

    const pool = poolAddress || (await this.resolvePool()).poolAddress;
    const blockNumber = await this.client.getBlockNumber();

    const data = await this.client.readContract({
      address: pool,
      abi: aavePoolAbi,
      functionName: "getUserAccountData",
      args: [user],
    });

    const [
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    ] = data;

    // Health factor has 18 decimals in Aave V3. A value of type(uint256).max means no debt.
    const maxUint256 = (1n << 256n) - 1n;
    const healthFactorFormatted = healthFactor >= maxUint256 - 1000n
      ? "∞ (No Debt)"
      : (Number(healthFactor / 10n ** 14n) / 10000).toFixed(4);

    return {
      user,
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
      healthFactorFormatted,
      observedAtBlock: blockNumber,
    };
  }
}