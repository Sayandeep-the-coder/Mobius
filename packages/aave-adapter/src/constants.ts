export const SEPOLIA_CHAIN_ID = 11155111;
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_MAINNET_FORK_CHAIN_ID = 31337;

// Official Aave V3 Sepolia addresses from official address book:
// https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Sepolia.sol
export const AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER = "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A" as const;
export const AAVE_SEPOLIA_POOL_PROXY_SNAPSHOT = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" as const;
export const AAVE_SEPOLIA_PROTOCOL_DATA_PROVIDER = "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31" as const;
export const AAVE_SEPOLIA_DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as const;
export const AAVE_SEPOLIA_ADAI = "0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8" as const;

// Official Aave V3 Mainnet addresses (for reference; Anvil fork will have Mainnet state)
// Mainnet PoolAddressesProvider (various chains - source: aave-address-book)
export const AAVE_MAINNET_POOL_ADDRESSES_PROVIDER = "0x8f314e8a6bc35117e5216aa876d61bfc429cbe4e" as const;

// Default RPC URLs
export const DEFAULT_SEPOLIA_RPC_URL = "https://rpc.sepolia.org";
export const DEFAULT_MONAD_RPC_URL = "https://testnet-rpc.monad.xyz";
export const DEFAULT_MONAD_MAINNET_RPC_URL = "https://rpc.monad.xyz";

