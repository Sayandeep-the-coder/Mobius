import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  isAddress,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import {
  SEPOLIA_CHAIN_ID,
  AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER,
  DEFAULT_SEPOLIA_RPC_URL,
} from "./constants.js";
import {
  poolAddressesProviderAbi,
  erc20Abi,
  aavePoolAbi,
  protocolDataProviderAbi,
} from "./abis.js";

export interface AaveClientOptions {
  rpcUrl?: string;
  providerAddress?: Address;
}

export interface AssetMetadata {
  address: Address;
  symbol: string;
  decimals: number;
  userBalance: bigint;
  userAllowance: bigint;
  observedAtBlock: bigint;
}

export interface UserAccountData {
  user: Address;
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
  healthFactorFormatted: string;
  observedAtBlock: bigint;
}

export class AaveSepoliaClient {
  public readonly client: PublicClient;
  public readonly providerAddress: Address;

  constructor(options?: AaveClientOptions) {
    const rpcUrl = options?.rpcUrl || process.env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC_URL;
    this.providerAddress = options?.providerAddress || AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER;

    this.client = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
  }

  /**
   * Asserts that connected RPC matches Ethereum Sepolia chainId (11155111).
   */
  async verifyChainId(): Promise<number> {
    const chainId = await this.client.getChainId();
    if (chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error(
        `Chain mismatch: Expected Ethereum Sepolia (${SEPOLIA_CHAIN_ID}), got ${chainId}. Never route Aave calls to other networks.`
      );
    }
    return chainId;
  }

  /**
   * Resolves the official Aave V3 Pool proxy dynamically from PoolAddressesProvider.
   * Verifies deployed bytecode to ensure contract exists at target address.
   */
  async resolvePool(): Promise<{ poolAddress: Address; blockNumber: bigint }> {
    await this.verifyChainId();

    const blockNumber = await this.client.getBlockNumber();

    const pool = await this.client.readContract({
      address: this.providerAddress,
      abi: poolAddressesProviderAbi,
      functionName: "getPool",
    });

    if (!pool || pool === zeroAddress) {
      throw new Error(
        `Failed to resolve Pool: Provider ${this.providerAddress} returned zero address.`
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
    const healthFactorFormatted =
      healthFactor >= maxUint256 - 1000n
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

