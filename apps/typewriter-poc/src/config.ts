export interface TypewriterServerConfig {
  chainId: number;
  rpcUrl: string;
  contractAddress?: `0x${string}`;
  schedulerAddress?: `0x${string}`;
  databaseUrl?: string;
  confirmations: {
    safeBlockDepth: number;
    finalizedBlockDepth: number;
  };
  blockPollingIntervalMs: number;
  sequencing: {
    order: "fifo" | "batch";
    submitIntervalMs: number;
  };
}

export const MONAD_TESTNET_TYPEWRITER_CONFIG: TypewriterServerConfig = {
  chainId: 10143,
  rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  contractAddress: process.env.TYPEWRITER_CONTRACT_ADDRESS as `0x${string}` | undefined,
  schedulerAddress: process.env.TYPEWRITER_SCHEDULER_ADDRESS as `0x${string}` | undefined,
  databaseUrl: process.env.DATABASE_URL,
  confirmations: {
    safeBlockDepth: 1,
    finalizedBlockDepth: 5,
  },
  blockPollingIntervalMs: 200,
  sequencing: {
    order: "fifo",
    submitIntervalMs: 300,
  },
};

export const LOCAL_ANVIL_TYPEWRITER_CONFIG: TypewriterServerConfig = {
  chainId: 31337,
  rpcUrl: "http://127.0.0.1:8545",
  confirmations: {
    safeBlockDepth: 1,
    finalizedBlockDepth: 2,
  },
  blockPollingIntervalMs: 100,
  sequencing: {
    order: "fifo",
    submitIntervalMs: 200,
  },
};

