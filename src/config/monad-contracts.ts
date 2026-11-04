/**
 * Monad Testnet Contract Configuration
 * Deployed target for Mobius agentic transaction intelligence & deterministic simulation.
 */

export const MONAD_TESTNET_CONFIG = {
  chainId: 10143,
  chainName: 'Monad Testnet',
  rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
  explorerUrl: 'https://testnet.monadscan.com',
  contracts: {
    mockSwapTarget: (process.env.NEXT_PUBLIC_MOCK_SWAP_TARGET_ADDRESS ||
      '0xA64c3bA49910baa01515360278AA2542AaAD0219') as `0x${string}`,
  },
} as const;

export const mockSwapTargetAbi = [
  {
    type: 'constructor',
    inputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'rateWad',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSimulatedOutput',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'quote',
    inputs: [{ name: 'amountIn', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setRate',
    inputs: [{ name: 'newRateWad', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'swap',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'minOut', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'RateUpdated',
    inputs: [
      { name: 'oldRate', type: 'uint256', indexed: false },
      { name: 'newRate', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SimulatedSwap',
    inputs: [
      { name: 'trader', type: 'address', indexed: true },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'minOut', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'error',
    name: 'OnlyOwner',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidRate',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SlippageExceeded',
    inputs: [
      { name: 'actualOut', type: 'uint256' },
      { name: 'minOut', type: 'uint256' },
    ],
  },
] as const;
