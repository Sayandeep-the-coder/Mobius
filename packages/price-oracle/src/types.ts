/**
 * Price and liquidity data provider interface.
 * Reads current prices and liquidity depths from oracles and AMMs,
 * independent of the target contract being simulated.
 */
import { type Address } from "viem";

/**
 * Price quote for a token pair.
 */
export interface PriceQuote {
  baseToken: Address;
  quoteToken: Address;
  price: string; // price of baseToken in quoteToken (decimal string)
  blockNumber: bigint;
  blockHash: `0x${string}`;
}

/**
 * Liquidity depth at a given price level.
 */
export interface LiquidityDepth {
  price: string;
  availableLiquidity: string;
}

/**
 * Liquidity depth for a token pair at various price levels.
 */
export interface LiquidityQuote {
  baseToken: Address;
  quoteToken: Address;
  depths: LiquidityDepth[];
  blockNumber: bigint;
  blockHash: `0x${string}`;
}

/**
 * Interface for reading price and liquidity data from oracles and AMMs.
 */
export interface PriceOracle {
  /**
   * Get the current price of a token pair.
   */
  getPrice(baseToken: Address, quoteToken: Address): Promise<PriceQuote>;

  /**
   * Get liquidity depth at various price levels for a token pair.
   */
  getLiquidityDepth(baseToken: Address, quoteToken: Address): Promise<LiquidityQuote>;

  /**
   * Get multiple prices at once.
   */
  getPrices(
    pairs: Array<{ baseToken: Address; quoteToken: Address }>
  ): Promise<PriceQuote[]>;
}
