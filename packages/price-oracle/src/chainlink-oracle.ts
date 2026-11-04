/**
 * Chainlink oracle price provider.
 * Reads ETH/USD and other price feeds from Chainlink AggregatorV3Interface.
 */
import { type Address, type Hex } from "viem";
import {
  createPublicClient,
  http,
  type PublicClient,
} from "viem";
import type { PriceOracle, PriceQuote, LiquidityQuote, LiquidityDepth } from "./types";

const CHAINLINK_AGGREGATOR_V3_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export class ChainlinkOracle implements PriceOracle {
  private client: PublicClient;

  constructor(client: PublicClient) {
    this.client = client;
  }

  static create(rpcUrl: string, chainId: number): ChainlinkOracle {
    const client = createPublicClient({
      chain: {
        id: chainId,
        name: "ChainlinkOracle",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
      transport: http(rpcUrl),
    });
    return new ChainlinkOracle(client);
  }

  async getPrice(baseToken: Address, quoteToken: Address): Promise<PriceQuote> {
    // Chainlink aggregator address would need to be looked up from a registry
    // For now, this is a placeholder that returns a mock price
    // In production, you'd look up the aggregator address from a registry
    throw new Error(
      `Chainlink price feed not implemented for token pair ${baseToken}/${quoteToken}. Use a known aggregator address.`
    );
  }

  async getLiquidityDepth(
    baseToken: Address,
    quoteToken: Address
  ): Promise<LiquidityQuote> {
    throw new Error(
      `Chainlink does not provide liquidity depth data for ${baseToken}/${quoteToken}`
    );
  }

  async getPrices(
    pairs: Array<{ baseToken: Address; quoteToken: Address }>
  ): Promise<PriceQuote[]> {
    const results = await Promise.all(
      pairs.map((pair) => this.getPrice(pair.baseToken, pair.quoteToken))
    );
    return results;
  }
}
