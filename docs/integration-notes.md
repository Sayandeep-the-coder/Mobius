# Mobius Integration Notes & Context Memory (Teammate 2 / Agent C)

**Role:** Teammate 2 — DeFi Adapters & Typewriter POC  
**Branch:** `feat/aave-typewriter`  
**File Ownership:** `packages/aave-adapter/**`, `apps/typewriter-poc/**`, `docs/integration-notes.md`  
**Architecture Revision:** 2 (4 November 2026)  
**Status:** One-day prototype build playbook  

---

## 1. Product Identity & Architecture Context

Mobius is an **agentic transaction-intelligence and execution-orchestration layer** for leveraged DeFi positions. It turns a user or agent objective into typed candidate plans, simulates them deterministically against pinned chain state, evaluates them against hard policies, and revalidates state immediately before execution.

### Key Architecture Boundaries
| Layer | Responsibility | Trusted For | Must Not |
|---|---|---|---|
| **AI Agent** | Interpret intent, propose candidate strategies, explain trade-offs | Planning, explanation | Deciding simulation pass/fail, calculating numbers, enforcing safety |
| **Deterministic Risk Engine** | Health Factor, liquidation distance, carry, stress scenarios | Accurate reproducible math | Depending on LLM for numbers |
| **Optimization Engine** | Rank feasible repairs by risk/cost/feasibility/objective | Finding best action | LLM overriding hard constraints |
| **Verification Layer** | Check recommendations against protocol constraints | Safety guardrails | Being bypassed by LLM |
| **Wallet / User** | Sign and submit | Authorization | Backend signing user transactions |

---

## 2. Chain Configuration & Ground Truth

| Network | Chain ID | Decimal | Hex | RPC URL | Purpose |
|---|---|---|---|---|---|
| **Monad Testnet** | 10143 | `10143` | `0x279f` | `https://testnet-rpc.monad.xyz` | Mobius harness + Typewriter execution; mock contracts only |
| **Ethereum Sepolia** | 11155111 | `11155111` | `0xaa36a7` | Provider URL (env) | Official Aave V3 test market |
| **Local Anvil fork** | 31337 | — | — | `127.0.0.1:8545` | Isolated stateful multi-action simulation with actual Aave V3 |

### Non-Negotiable Chain Rules
1. **Never conflate environments:** Aave V3 test integration runs exclusively on **Ethereum Sepolia** (chainId `11155111`). Never label a Sepolia tx as a Monad tx, and never deploy a fake or custom Aave contract to Monad.
2. **Dynamic resolution:** Always query `PoolAddressesProvider.getPool()` dynamically at runtime. Never hardcode the Pool proxy address without verification.
3. **Fail closed on chain ID mismatch:** If RPC chainId does not match `11155111` for Aave Sepolia, `10143` for Monad Testnet, or `31337` for Anvil fork, reject immediately.
4. **Anvil fork isolation:** Anvil fork (chainId `31337`) provides access to actual Aave V3 Mainnet contracts in a local sandbox. State changes do not settle on Monad Testnet or Mainnet.

---

## 3. Official Aave V3 Sepolia Ground Truth

*Source: [Aave V3 Sepolia Address Book](https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Sepolia.sol)*

| Contract / Entity | Address | Verification & Usage |
|---|---|---|
| **PoolAddressesProvider** | `0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A` | Official registry; query `getPool()` dynamically at runtime |
| **Pool Proxy (Snapshot)** | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` | Dynamic lookup target from provider; verify `getCode(pool) != "0x"` |
| **Protocol Data Provider** | `0x3e9708d80f7B3e43118013075F7e95CE3AB31F31` | Reserve data & user reserve position metrics |
| **DAI Underlying Asset** | `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357` | Sepolia test reserve asset |
| **DAI aToken (aDAI)** | `0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8` | Interest-bearing receipt token |

### Two-Step Aave Supply Flow Protocol
1. **Read Metadata & State:**
   - Read token `symbol()`, `decimals()`, `balanceOf(user)`, and `allowance(user, pool)`.
2. **Supply Preflight (`POST /v1/aave/sepolia/supply/preflight`):**
   - If `allowance < amount`: return `simulationStatus: "NOT_READY"`, `approvalRequired: true`.
   - If `allowance >= amount`: execute Viem `simulateContract({ address: pool, abi: aavePoolAbi, functionName: "supply", args: [asset, amount, user, 0], account: user })`.
3. **Wallet Approval Execution:**
   - User wallet signs `approve(pool, amount)`. Wait for receipt (`status === "success"`).
4. **Re-Run Preflight:**
   - Backend reads updated allowance; `simulateContract` passes.
5. **Wallet Supply Execution:**
   - User wallet signs `supply(asset, amount, user, 0)`. Wait for receipt and verify aToken position change.

---

## 4. Typewriter POC Architecture & Compatibility Boundary

*Source: [Official Monad Developers Typewriter Repository](https://github.com/monad-developers/typewriter)*

Typewriter is an **optional execution adapter for compatible Monad application mutations**.

### Role in Mobius
- **Execution sequencing:** Sits *after* Mobius planning, deterministic simulation, policy checking, and pre-execution revalidation.
- **Local EVM acceptance:** Executes mutations in an embedded local EVM before batching/settling onchain.
- **Status Lifecycle:** `received` -> `accepted` (local EVM preconfirmation) -> `included` -> `safe` -> `finalized`.
- **Critical boundary:** Typewriter is **not** a generic wrapper for external DeFi protocols. It does not replace the simulation engine and must never be used to route external Aave calls on day one.

### Local-First Experiment Runbook
1. Clone upstream Typewriter in `vendor/typewriter`:
   ```bash
   git clone https://github.com/monad-developers/typewriter.git vendor/typewriter
   cd vendor/typewriter
   bun install
   ```
2. Start PostgreSQL (`docker run --name typewriter-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`).
3. Run official `apps/token` in dev mode:
   ```bash
   cd apps/token
   cp .env.example .env
   bun run dev
   ```
4. Verify mutation lifecycle from client authorization to settlement.

---

## 5. Teammate 2 Deliverables & File Layout

```
Mobius/
├── docs/
│   └── integration-notes.md               <-- This document
├── packages/
│   └── aave-adapter/                      <-- Aave Sepolia Adapter
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── abis.ts                    <-- Minimal type-safe ABIs
│       │   ├── constants.ts               <-- Addresses, chain IDs, RPCs
│       │   ├── aave-client.ts             <-- Viem Sepolia client & pool reader
│       │   ├── supply-preflight.ts        <-- Supply preflight & approval gate
│       │   ├── withdraw-preflight.ts      <-- Withdraw simulation & balance gate
│       │   └── index.ts                   <-- Main package export
│       └── test/
│           └── aave-adapter.test.ts       <-- Full automated test suite
└── apps/
    └── typewriter-poc/                    <-- Typewriter Adapter & Runner
        ├── package.json
        ├── tsconfig.json
        ├── README.md                      <-- Setup, dev commands & lifecycle
        └── src/
            ├── config.ts                  <-- Monad 10143 & Anvil settings
            ├── typewriter-adapter.ts      <-- Mutation adapter (lifecycle tracking)
            └── run-lifecycle-demo.ts      <-- End-to-end execution simulation
```

---

## 6. Teammate 2 Acceptance Checklist

- [x] Verified Ethereum Sepolia chain ID (`11155111`) and rejected wrong chain IDs.
- [x] Resolved Pool dynamically via `PoolAddressesProvider.getPool()`.
- [x] Checked token `decimals()`, `balanceOf()`, and `allowance()`.
- [x] Implemented two-transaction gate: returned `NOT_READY` + `approvalRequired: true` when allowance is insufficient.
- [x] Built simulation flow using Viem `simulateContract` with user as account.
- [x] Ensured backend NEVER signs or broadcasts user transactions.
- [x] Typewriter adapter strictly isolates application mutations from external DeFi calls.
- [x] Documented mutation lifecycle milestones (`received`, `accepted`, `included`, `safe`, `finalized`).

