# Mobius Project Memory

**Persistent context for all sessions.**  
**Project:** Mobius — Agentic Transaction Intelligence  
**Architecture revision:** 2  
**Date:** 4 November 2026  
**Working directory:** `/Volumes/T7 Shield/Vansh_Workspace/dev/Mobius`  
**Host Environment:** macOS (Darwin arm64)  
**Status:** One-day build prototype (Active Development)

---

## Current Workstream Progress Status

| Workstream | Owner | Role & Ownership | Current Progress | Next Step |
|---|---|---|---|---|
| **Teammate 1** (You) | Agent B | `contracts/**`, `deployments/monad-testnet.json` | **100% Deployed, Verified & Integrated**: `MockSwapTarget` deployed at `0xA64c3bA49910baa01515360278AA2542AaAD0219` (Tx: `0x465de4...`, Block: `76872485`). Verified on Sourcify. Live integration test passed (10/10 checks). Frontend config and `.env` connected. | Available for Lead (Agent A) backend preflight integration and live state drift testing (`setRate`). |
| **Teammate 2** | Agent C | `packages/aave-adapter/**`, `apps/typewriter-poc/**`, `docs/integration-notes.md` | **Completed on `feat/aave-typewriter`**: Dynamic Pool resolution (`PoolAddressesProvider`), 2-step approval flow, supply/withdraw preflight simulator (6/6 tests passing), Typewriter mutation lifecycle runner. | Merge to `main` when Lead reviews. |
| **Lead / Backend** | Agent A | `apps/api/**`, `packages/chain-config/**`, `packages/contracts-abi/**`, `packages/simulation/**`, `packages/policies/**` | **In Progress**: Fastify API skeleton, routes (`health`, `chains`, `preflight`, `agentic`, `execution`, `aave`), Viem chain clients, error classifier. | Wire up MockSwapTarget preflight and revalidation using deployed Monad contract address. |

---

## 1. Product Identity

Mobius is an **agentic transaction-intelligence and execution-orchestration layer**. It turns a user or agent objective into typed candidate plans, simulates them deterministically against pinned chain state, evaluates them against hard policies, and revalidates immediately before execution.

It is **not**:
- An `eth_call` wrapper
- A portfolio dashboard
- An AI chatbot that executes trades
- A replacement for deterministic simulation with LLM judgment

---

## 2. Core Responsibility Boundaries

| Layer | Responsibility | Trusted For | Must Not |
|---|---|---|---|
| AI Agent | Interpret intent, propose typed candidates, explain trade-offs | Planning, explanation | Deciding simulation pass/fail, calculating state, enforcing safety |
| Deterministic Risk/Calculation Engine | Health Factor, liquidation distance, carry, stress scenarios | Accurate, reproducible math | Depending on LLM for numbers |
| Optimization Engine | Rank feasible repairs by risk/cost/feasibility/objective | Finding best action | LLM overriding hard constraints |
| Verification Layer | Check recommendations against protocol constraints | Safety guardrails | Being bypassed by LLM |
| Wallet / User | Sign and submit | Authorization | Backend signing user transactions |

---

## 2.5 Full Architecture Flow (The 8 Execution Stages)

```mermaid
flowchart TD
    subgraph S1["1 - Security Gate"]
        User["User / Autonomous Agent"] --> IdVerif["Identity & Signature Verification"]
        IdVerif --> PermEngine["Permission Engine\n(Allowlists + Spend & Execution Limits)"]
    end

    subgraph S2["2 - Intent & Constraints"]
        PermEngine --> IntentParser["Intent Parser\n(Typed Objective + Hard Constraints)"]
    end

    subgraph S3["3 - Read On-Chain"]
        IntentParser --> StateAcq["State Acquisition"]
        StateAcq --> SnapMgr["Snapshot Manager\n(chainId + blockNumber + blockHash + fingerprint)"]
    end

    subgraph S4["4 - Pre-flight & Simulate"]
        SnapMgr --> Planner["Agentic Planner\n(Candidate plans from approved templates)"]
        Planner --> SimEngine["Simulation Engine"]
        SimEngine --> BranchSingle["Single-call\n(eth_call at pinned block)"]
        SimEngine --> BranchMulti["Multi-step\n(Isolated Anvil fork)"]
        SimEngine --> BranchScen["Counterfactual Scenarios\n(Price / Liquidity / Balance)"]
        BranchSingle --> SimResults["Simulation Results\n(Real EVM, NOT LLM)"]
        BranchMulti --> SimResults
        BranchScen --> SimResults
        SimResults --> PolicyEval["Hard Policy Evaluator\n(Deterministic hard constraints)"]
        PolicyEval --> AcceptCheck{"Acceptable plan?"}
        AcceptCheck -- "No (Replan)" --> Planner
    end

    subgraph S5["5 - Pre-flight 2 / Revalidation Gate"]
        AcceptCheck -- "Yes" --> FreshSim["Fresh-State Revalidation\n(Re-read deps + re-simulate exact calldata)"]
        FreshSim --> DriftCheck{"Relevant state\nchanged?"}
    end

    DriftCheck -- "Yes: REPLAN_REQUIRED / BLOCKED" --> IntentParser

    subgraph S6["6 - Authorize"]
        DriftCheck -- "No: VALID" --> ExecAuth["Execution Authorization Form\n(Review + display + expiry check)"]
        ExecAuth --> UserKeys["User / Scoped Credential Keys\n(Mobius NEVER signs user transactions)"]
    end

    subgraph S7["7 - Route & Execute"]
        UserKeys --> ExecRouter["Execution Router"]
        ExecRouter --> AaveRoute["Aave V3 Adapter\n(Supply / Withdraw only)"]
        ExecRouter --> TypewriterRoute["Typewriter Adapter\n(Compatible mutations only)"]
        ExecRouter --> StandardRoute["Standard Monad RPC"]

        AaveRoute --> SepoliaChain["Ethereum Sepolia\n(Chain ID 11155111)"]
        TypewriterRoute --> TypewriterApp["Typewriter App\n(Monad Testnet 10143)"]
        StandardRoute --> MonadChain["Monad Testnet\n(Chain ID 10143)"]
    end

    subgraph S8["8 - Monitor"]
        SepoliaChain --> ExecMonitor["Execution Monitor\n(submitted → included → safe → finalized)"]
        TypewriterApp --> ExecMonitor
        MonadChain --> ExecMonitor
        ExecMonitor --> OutcomeVerif["Outcome Verification\n(Predicted vs Actual)"]
        OutcomeVerif -- "Feedback if state deviated" --> IntentParser
        ExecMonitor --> AuditLogs[("Audit Logs & Security Events")]
    end
```

### Stage Summary & Key Guarantees:
- **Stage 1 (Security Gate):** Identity verification and deterministic permission engine.
- **Stage 2 (Intent & Constraints):** Typed intent parser. No arbitrary calldata allowed.
- **Stage 3 (Read On-Chain):** Pinned block state snapshot + dependency fingerprint.
- **Stage 4 (Pre-flight & Simulate):** Deterministic candidate generation; EVM execution (eth_call or isolated Anvil fork); hard policy evaluation. LLM never decides pass/fail.
- **Stage 5 (Pre-flight 2 / Revalidation Gate):** Fresh dependency re-check + exact re-simulation right before authorization.
- **Stage 6 (Authorize):** Clear risk disclosure; user/scoped credentials sign; backend never signs or custodies keys.
- **Stage 7 (Route & Execute):** Deterministic routing to Aave Sepolia, Typewriter Monad, or standard Monad RPC.
- **Stage 8 (Monitor):** Full lifecycle tracking (`submitted` -> `included` -> `safe` -> `finalized`), predicted-vs-actual verification, audit logging.


---

## 3. Chain Configuration (EXACT)

| Network | Chain ID | Decimal | Hex | RPC URL | Purpose |
|---|---|---|---|---|---|
| Monad Testnet | 10143 | 10143 | 0x279f | `https://testnet-rpc.monad.xyz` | Mobius harness + Typewriter POC |
| Ethereum Sepolia | 11155111 | 11155111 | 0xaa36a7 | Provider URL (env) | Aave V3 test market |
| Local Anvil fork | — | — | — | `127.0.0.1:8545` | Stateful multi-action simulation |

**Rules:**
- `eth_chainId` must be verified at startup against these exact values. Fail closed on mismatch.
- Store `chainId` with every snapshot, plan, action, hash, contract address, and status.
- Never use Sepolia Aave Pool address on Monad. Never label Sepolia tx as Monad tx.
- Monad block frequency: 300 ms; full finality: 600 ms. TOCTOU risk is real.

---

## 4. Team & File Ownership (STRICT)

Three branches, three workstreams, no overlapping edits:

```
git checkout -b feat/mobius-api          # You (Lead / Agent A)
git checkout -b feat/monad-contract     # Teammate 1 (Agent B)
git checkout -b feat/aave-typewriter    # Teammate 2 (Agent C)
```

| Owner | Human Responsibility | Agent | Allowed File Paths |
|---|---|---|---|
| You — Lead | Architecture, API contracts, snapshot manager, planner/orchestrator, simulator integration, policy evaluation, merge decisions | Agent A | `apps/api/**`, `packages/chain-config/**`, `packages/contracts-abi/**`, `packages/simulation/**`, `packages/policies/**` |
| Teammate 1 | Foundry setup, MockSwapTarget, tests, deploy, verify, publish addresses | Agent B | `contracts/**`, `deployments/monad-testnet.json` |
| Teammate 2 | Aave Sepolia adapter, real test tx, Typewriter local experiment | Agent C | `packages/aave-adapter/**`, `apps/typewriter-poc/**`, `docs/integration-notes.md` |

**Merge protocol:** Human owner reads diff, runs tests, checks no `.env`/keys/`node_modules`/`out/` committed, confirms chain IDs + addresses explicit, confirms no invented deployment addresses.

---

## 5. Shared TypeScript Interfaces (packages/contracts-abi/src/)

All token amounts, gas, wei = decimal strings or bigint. **No JS floating-point.**

### preflight.ts

```typescript
export type PreflightStatus = "SIMULATION_PASSED" | "SIMULATION_REVERTED" | "UNSUPPORTED";
export type RiskLevel = "LOW" | "REVIEW" | "BLOCKED";

export interface PreflightRequest {
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string; // decimal wei string
}

export interface PreflightResponse {
  requestId: string;
  chainId: number;
  status: PreflightStatus;
  riskLevel: RiskLevel;
  blockNumber: string;
  blockHash: `0x${string}`;
  observedAt: string;
  gasEstimate?: string;
  warnings?: string[];
  returnData?: `0x${string}`;
  error?: {
    kind: string;
    selector?: `0x${string}`;
    decodedName?: string;
    message: string;
  };
  recommendations: string[];
  caveat: string;
}
```

### aave-adapter/src/

```typescript
export interface AaveSupplyPreflightRequest {
  user: `0x${string}`;
  asset: `0x${string}`;
  amount: string; // base units, decimal string
}

export interface AaveSupplyPreflightResponse {
  chainId: 11155111;
  blockNumber: string;
  blockHash: `0x${string}`;
  pool: `0x${string}`;
  asset: `0x${string}`;
  user: `0x${string}`;
  balance: string;
  allowance: string;
  approvalRequired: boolean;
  canSimulateSupply: boolean;
  simulationStatus: "NOT_READY" | "PASSED" | "REVERTED";
  reason?: string;
}
```

### agentic types

```typescript
export type PlanDecision = "EXECUTE" | "HOLD" | "HUMAN_REVIEW";
export type CandidateStatus = "SIMULATION_PASSED" | "SIMULATION_REVERTED" | "BLOCKED_BY_POLICY" | "UNSUPPORTED";
export type RevalidationStatus = "VALID" | "REPLAN_REQUIRED" | "BLOCKED";

export interface StateSnapshot {
  chainId: number;
  blockNumber: string;
  blockHash: `0x${string}`;
  observedAt: string;
  stateFingerprint: string;
  dependencies: Array<{ label: string; address?: `0x${string}`; valueHash: string }>;
}

export interface AgenticPlanRequest {
  chainId: number;
  account: `0x${string}`;
  objective: { type: string; description: string };
  constraints: {
    minAmountOut?: string;
    maxSlippageBps?: number;
    maxInputAmount?: string;
    maxGasWei?: string;
    minHealthFactor?: string;
    requireHumanApproval?: boolean;
  };
  context: { protocol: string; actionFamily: string; parameters: Record<string, string> };
}

export interface CandidateResult {
  candidateId: string;
  strategy: string;
  status: CandidateStatus;
  encodedCalls: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }>;
  estimatedGas?: string;
  expectedStateDelta: Record<string, string>;
  constraintViolations: string[];
  assumptions: string[];
  explanation: string;
}

export interface AgenticPlanResponse {
  planId: string;
  snapshot: StateSnapshot;
  candidates: CandidateResult[];
  selectedCandidateId?: string;
  decision: PlanDecision;
  decisionReason: string;
  caveat: string;
}

export interface RevalidationRequest {
  planId: string;
  candidateId: string;
}

export interface RevalidationResponse {
  planId: string;
  status: RevalidationStatus;
  originalSnapshot: StateSnapshot;
  latestSnapshot: StateSnapshot;
  changedDependencies: string[];
  freshSimulationStatus?: CandidateStatus;
  reason: string;
}
```

### Policy interface

```typescript
export interface AgentPolicy {
  allowedChains: number[];
  allowedActions: string[];
  maxAmountPerAction: string;
  maxTotalPerSession: string;
  allowedAssets: `0x${string}`[];
  expiresAt: number;
  requireHumanApprovalAbove: string;
}
```

---

## 6. Repository Structure (EXACT)

```
mobius/
  apps/
    api/
      src/
        server.ts
        routes/
          health.ts
          preflight.ts
          agentic.ts
          execution.ts
          aave.ts
        services/
          preflight-service.ts
          error-classifier.ts
          orchestration-service.ts
        env.ts
      package.json
      tsconfig.json
    typewriter-poc/
  contracts/
    foundry.toml
    src/
      MockSwapTarget.sol
    test/
      MockSwapTarget.t.sol
    script/
      DeployMockSwapTarget.s.sol
  packages/
    chain-config/
      src/index.ts
    contracts-abi/
      src/preflight.ts
      src/mock-swap.ts
    aave-adapter/
      src/addresses.ts
      src/abis.ts
      src/aave-client.ts
    simulation/          # (Agent A)
    policies/            # (Agent A)
  deployments/
    monad-testnet.json
    sepolia-aave.json
  docs/
    integration-notes.md
    demo-script.md
    build-report.md
  .env.example
  .gitignore
  README.md
```

**.gitignore contents:**
```
node_modules/
.env
.env.*
!.env.example
out/
cache/
artifacts/
.broadcast/
coverage/
.DS_Store
*.keystore
*.pem
```

---

## 7. Environment Variables (.env.example)

```
# Monad Testnet
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143

# Ethereum Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_CHAIN_ID=11155111

# Aave V3 Sepolia
AAVE_SEPOLIA_POOL_ADDRESSES_PROVIDER=0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A
AAVE_SEPOLIA_DAI=0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357

# Typewriter runtime
DATABASE_URL=postgresql://mobius:mobius_dev_password@localhost:5432/mobius
TYPEWRITER_CONTRACT_ADDRESS=
TYPEWRITER_SCHEDULER_PRIVATE_KEY=

# API
PORT=8787
NODE_ENV=development
```

**Never commit `.env`, real keys, mnemonics, or API secrets.** Use burner wallets for testnets.

---

## 8. Aave V3 Sepolia Addresses (Official Address Book)

| Item | Address | Use |
|---|---|---|
| PoolAddressesProvider | `0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A` | Registry; query `getPool()` at runtime |
| Pool proxy (snapshot) | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` | Reference only; prefer dynamic `getPool()` |
| Protocol Data Provider | `0x3e9708d80f7B3e43118013075F7e95CE3AB31F31` | Reserve/user reserve data |
| DAI underlying | `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357` | Candidate Sepolia test reserve |
| DAI aToken | `0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8` | Interest-bearing receipt token |

**Adapter must resolve Pool dynamically via `getPool()`, verify `getCode(pool) !== 0x`, and confirm asset is active in current Sepolia market.**

### Aave Pool ABI (minimal)

```typescript
export const poolAddressesProviderAbi = [
  { type: "function", name: "getPool", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
] as const;

export const erc20Abi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const aavePoolAbi = [
  { type: "function", name: "supply", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }, { name: "onBehalfOf", type: "address" }, { name: "referralCode", type: "uint16" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }, { name: "to", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getUserAccountData", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "totalCollateralBase", type: "uint256" }, { name: "totalDebtBase", type: "uint256" }, { name: "availableBorrowsBase", type: "uint256" }, { name: "currentLiquidationThreshold", type: "uint256" }, { name: "ltv", type: "uint256" }, { name: "healthFactor", type: "uint256" }] },
] as const;
```

**Supply flow:** Read balance → read allowance → if insufficient, return `NOT_READY` + `approvalRequired=true` → user signs `approve(pool, amount)` → wait for receipt → re-run preflight → simulate `Pool.supply(asset, amount, user, 0)` → user signs → wait for receipt → verify aToken balance / position.

---

## 9. MockSwapTarget (Monad Testnet Demo Contract)

**File:** `contracts/src/MockSwapTarget.sol`  
**Purpose:** Deterministic simulation harness, NOT a real DEX. Does not exchange tokens or custody assets.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

contract MockSwapTarget {
    address public immutable owner;
    uint256 public rateWad = 1e18;
    uint256 public totalSimulatedOutput;

    error OnlyOwner();
    error InvalidRate();
    error InvalidAmount();
    error SlippageExceeded(uint256 actualOut, uint256 minOut);

    event RateUpdated(uint256 oldRate, uint256 newRate);
    event SimulatedSwap(address indexed trader, uint256 amountIn, uint256 amountOut, uint256 minOut);

    constructor() { owner = msg.sender; }

    function setRate(uint256 newRateWad) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newRateWad == 0) revert InvalidRate();
        uint256 oldRate = rateWad;
        rateWad = newRateWad;
        emit RateUpdated(oldRate, newRateWad);
    }

    function quote(uint256 amountIn) public view returns (uint256) {
        return (amountIn * rateWad) / 1e18;
    }

    function swap(uint256 amountIn, uint256 minOut) external returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        amountOut = quote(amountIn);
        if (amountOut < minOut) revert SlippageExceeded(amountOut, minOut);
        totalSimulatedOutput += amountOut;
        emit SimulatedSwap(msg.sender, amountIn, amountOut, minOut);
    }
}
```

### Error Classification (MockSwapTarget)

| Error | Kind | Recommendation |
|---|---|---|
| `SlippageExceeded(actualOut, minOut)` | `STALE_QUOTE_OR_MIN_OUT_TOO_HIGH` | Refresh quote; lower minOut only if user policy allows (user decision, not automatic) |
| `InvalidAmount()` | `INVALID_AMOUNT` | Use positive amount |
| `OnlyOwner()` | `AUTHORIZATION_FAILURE` | Connect deployer/admin wallet; do not bypass |
| Unknown revert | `UNKNOWN_REVERT` | Preserve raw revert data; do not guess |

### Foundry Setup (contracts/foundry.toml)

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
metadata = true
metadata_hash = "none"
use_literal_content = true
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
monad_testnet = "${MONAD_RPC_URL}"
```

**Commands:** `forge fmt`, `forge build`, `forge test -vvv`

---

## 10. Chain Config (packages/chain-config/src/index.ts)

```typescript
import { createPublicClient, defineChain, http } from "viem";
import { sepolia } from "viem/chains";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://testnet.monadscan.com" },
  },
});

export const monadPublicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"),
});

export const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL!),
});

export async function assertChain(client: { getChainId: () => Promise<number> }, expected: number) {
  const actual = await client.getChainId();
  if (actual !== expected) {
    throw new Error(`RPC chain mismatch: expected ${expected}, received ${actual}`);
  }
}
```

**Startup:** `assertChain(monadPublicClient, 10143)` and `assertChain(sepoliaPublicClient, 11155111)`. Fail closed on mismatch.

---

## 11. Snapshot & Freshness Rules

Every simulation result must carry:
- `chainId`, `blockNumber`, `blockHash`, `observedAt`
- Contract/protocol dependencies actually read
- Fingerprint of relevant state (e.g., `rateWad`, oracle answer, reserve liquidity, user balance, allowance, nonce, collateral/debt values)
- Assumptions and configured drift thresholds

**Revalidation logic:**
- A new block alone does NOT invalidate a plan.
- Compare state dependencies that matter to the plan.
- Re-simulate exact selected calldata against latest state.
- Return `VALID` only if new simulation + all hard constraints pass.
- Return `REPLAN_REQUIRED` when assumptions materially changed or call now reverts.
- Return `BLOCKED` when objective cannot be achieved within user constraints.
- Never invalidate solely because block number advanced.

**Multi-step simulation:** Isolated Anvil fork per candidate. Multiple remote `eth_call` requests do NOT persist state between calls.

```bash
anvil \
  --fork-url "$MONAD_RPC_URL" \
  --fork-block-number "$SNAPSHOT_BLOCK" \
  --chain-id 10143 \
  --port 8545
```

---

## 12. API Endpoints — Detailed Behavior

### POST /v1/preflight
- Input: `chainId`, `from`, `to`, `data`, `value` (decimal string)
- Validate with Zod; resolve only chain IDs 10143 and 11155111
- Record latest block before simulation
- `publicClient.call({ account, to, data, value, blockNumber })`
- If call throws → `SIMULATION_REVERTED`, capture revert data, classify error, never guess
- `estimateGas` only if call succeeds
- Return block number, hash, observedAt, gas estimate, warnings, return data, recommendations, caveat

### POST /v1/agentic/plan
- Input: typed objective + constraints + typed action context (NOT trusted raw calldata from LLM)
- Validate schema and policy
- Read pinned state snapshot; record chainId, block, timestamp, dependency fingerprint
- Generate typed candidates from approved templates (deterministic; LLM may assist intent only)
- Compile to calldata via allowlisted adapter
- Simulate each candidate against same snapshot (isolated fork for stateful)
- Reject hard-constraint violations; rank feasible candidates deterministically
- Return `EXECUTE` / `HOLD` / `HUMAN_REVIEW` + snapshot + candidates + decision reason

### POST /v1/agentic/revalidate
- Input: `planId`, `candidateId`
- Read latest block + re-read relevant dependencies
- Recompute fingerprint; compare with original assumptions/thresholds
- Re-simulate exact calldata
- Return `VALID` / `REPLAN_REQUIRED` / `BLOCKED`

### POST /v1/execution/prepare
- Returns validated wallet transaction request
- **Backend does NOT sign or broadcast user transactions**

### GET /v1/execution/:id
- Returns execution + settlement lifecycle status (`submitted`, `included`, `safe`, `finalized`)
- Compares predicted vs actual effects

### Aave Endpoints
- `GET /v1/aave/sepolia/market` — resolve Pool + asset metadata
- `GET /v1/aave/sepolia/positions/:user` — read position summary
- `POST /v1/aave/sepolia/supply/preflight` — balance/allowance + simulate supply if ready
- `POST /v1/aave/sepolia/withdraw/preflight` — simulate withdrawal

---

## 13. One-Day Schedule (09:00–19:00)

| Time | You (Backend) | Teammate 1 (Solidity) | Teammate 2 (Aave/Typewriter) | Gate |
|---|---|---|---|---|
| 09:00–09:30 | Lock schemas, chain config, snapshot interface | Foundry setup, MockSwapTarget skeleton | Clone Typewriter, verify toolchain, create Sepolia burner | Chain IDs verified; file ownership agreed |
| 09:30–11:00 | Express health/chains/preflight + StateSnapshot service | Contract + Foundry unit tests | Aave provider/pool/token reads; Typewriter local token example boot | API starts; forge test passes; Pool resolves |
| 11:00–12:30 | Candidate planner, simulator adapter, deterministic evaluator | Deploy Monad target, record address, verify | Aave supply preflight/allowance; Typewriter mutation lifecycle locally | Candidate plan returns pass/revert; deployed code readable |
| 12:30–13:00 | Integrate endpoint contracts; checkpoint blockers | Fix test/deployment issues | Obtain Sepolia gas/test asset; verify Typewriter statuses | Shared smoke tests pass |
| 13:00–14:30 | Implement revalidation; induce state drift, block stale plan | Change rateWad for controlled test; help verify tx | Execute approval + small Aave supply if faucet/reserve permits | Revalidation returns REPLAN_REQUIRED after drift; Aave receipt or blocker logged |
| 14:30–16:00 | Wire end-to-end planner → simulation → revalidation → wallet prepare | Review contract and onchain constraints | Typewriter FIFO/batch experiment and integration note | Main Mobius flow works without Typewriter |
| 16:00–17:30 | Add execution monitor and predicted-vs-observed record | Final deployment metadata and tests | Optional Typewriter Testnet deploy; optional Aave withdraw | Each chain demo clearly separated |
| 17:30–18:30 | Freeze API, docs, rehearsal | Review code and deploy evidence | Capture Aave/Typewriter evidence and limitations | No unreviewed code or invented outcomes |
| 18:30–19:00 | Run full demo and record metrics | Present contract/test results | Present Aave/Typewriter results | Reproducible demo and build report |

### Priority if time slips
1. **Must ship:** Monad target + Mobius preflight + plan candidates + snapshot revalidation that blocks stale plan
2. **Must ship if market/faucet allows:** Aave Sepolia provider resolution + balance/allowance reads + supply simulation + one user-signed test supply (otherwise document exact blocker)
3. **Should ship:** Local Typewriter sample with real signed mutation + observed accepted/included lifecycle
4. **Stretch:** Typewriter on Monad Testnet; stateful Anvil multi-step runner; Aave borrow/repay/Health Factor agent; withdrawal; frontend polish

---

## 14. Typewriter Integration Rules

- **Local first:** Clone `https://github.com/monad-developers/typewriter`, run `apps/token` example with PostgreSQL + local Anvil
- Pin the tested commit hash in `docs/integration-notes.md`
- Typewriter is **after** Mobius planning, simulation, policy, and revalidation
- Does **not** replace Mobius; does **not** make arbitrary DeFi calls Typewriter-compatible
- Does **not** route Aave Pool supply/borrow through Typewriter on day one
- `accepted` ≠ onchain inclusion or finality
- Testnet POC: only after local works; dedicated scheduler key + burner wallet

### Typewriter config pattern (adapt to pinned repo version)

```typescript
const typewriter = await createTypewriter(MobiusAgentApp, {
  address: process.env.TYPEWRITER_CONTRACT_ADDRESS as `0x${string}`,
  account: privateKeyToAccount(process.env.TYPEWRITER_SCHEDULER_PRIVATE_KEY as `0x${string}`),
  chainId: 10143,
  rpcUrl: process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
  database: { url: process.env.DATABASE_URL! },
  confirmations: { safeBlockDepth: 1, finalizedBlockDepth: 5 },
  blockPollingIntervalMs: 200,
  sequencing: { order: "fifo", submitIntervalMs: 300 },
});
```

---

## 15. Explicit Non-Goals (DO NOT CLAIM OR BUILD)

- No mainnet deployment, real funds, production-readiness claims, key custody
- No full Aave protocol onto Monad; no custom/fake Aave contract
- LLM-generated plan ≠ simulation result
- Passing snapshot simulation ≠ guarantee of inclusion/success
- Mobius cannot see or predict all pending transactions / mempool ordering
- No automatic relaxation of slippage, min output, debt, collateral, spending caps
- No autonomous fund transfers without explicit user-authorized limits + signature
- Typewriter accepted ≠ safe or finalized onchain

---

## 16. Acceptance Checklist (Final)

- [ ] Monad RPC returns chain ID 10143
- [ ] Sepolia RPC returns chain ID 11155111
- [ ] Burner deployer + Typewriter scheduler are test accounts
- [ ] No private keys, mnemonics, `.env`, keystores, or API secrets committed
- [ ] Backend never signs user transactions
- [ ] `forge fmt` clean; `forge build` passes; `forge test -vvv` passes
- [ ] MockSwapTarget deployed to Monad Testnet; code exists at address
- [ ] `deployments/monad-testnet.json` has actual address + tx hash
- [ ] `/health` works; `/v1/chains` lists both distinct networks
- [ ] `/v1/preflight` records block number/hash + exact sender/target/chain
- [ ] `/v1/agentic/plan` returns typed candidates, snapshot, hard-constraint results, decision
- [ ] Every candidate simulated against same initial snapshot; stateful candidates use isolated forks
- [ ] Revalidation detects changed `rateWad`/quote dependency → `REPLAN_REQUIRED` or `BLOCKED`
- [ ] Mobius never auto-lowers `minOut` or loosens user constraints
- [ ] Passing simulation described as snapshot-based, not a guarantee
- [ ] Stale demo tx returns `SIMULATION_REVERTED`; corrected demo tx returns `SIMULATION_PASSED`
- [ ] Unknown revert remains unknown; no fabricated diagnosis
- [ ] Every response says simulation is snapshot-based
- [ ] Aave testnet mode selects Sepolia; Pool resolved dynamically from provider
- [ ] Asset decimals, balance, allowance read from chain
- [ ] Missing allowance returns `NOT_READY`
- [ ] Approval is exact amount, user-signed, receipt-confirmed
- [ ] Supply simulated after approval, then user-signed
- [ ] Supply receipt + position update verified
- [ ] Typewriter source pinned to commit hash; `bun install` succeeds
- [ ] Local sample runs with PostgreSQL + Foundry/Anvil
- [ ] Signed mutation submitted; accepted distinguished from included/finalized

---

## 17. Likely Blockers & Fixes

| Symptom | Likely Cause | Response |
|---|---|---|
| `eth_chainId` differs | Wrong RPC URL or chain config | Stop; fix RPC before signing/deploying |
| Monad deploy: insufficient balance | Burner has no test MON / faucet cap | Request faucet funds; re-check balance |
| Foundry compiler/EVM mismatch | Stale template / wrong target | Re-read current Monad template; clean and rebuild |
| Typewriter server cannot connect to DB | Invalid `DATABASE_URL`, Postgres down, wrong port | Check `docker ps`, logs, credentials |
| Aave pool resolves to zero / no code | Wrong provider/network / stale address | Confirm Sepolia chain ID + current Aave Address Book |
| Aave supply reverts | No token / wrong decimals / no allowance / inactive reserve | Read balance/allowance/reserve state; inspect revert data |
| Generic preflight passes but later tx fails | State moved after simulation | Explain snapshot caveat; refresh and re-simulate before signature |

---

## 18. Build Report Contents (`docs/build-report.md`)

- Commit hashes and branch names merged
- Node, Bun, Foundry, Solidity compiler, Typewriter commit versions
- Monad and Sepolia chain IDs used
- Contract addresses, deploy tx hashes, block numbers, verification links
- API routes + example request/response JSON
- Preflight test case: old quote → revert; refreshed quote → pass
- Aave supply tx hash, asset, amount, Pool address, resulting position evidence
- Typewriter run mode (local Anvil or Monad Testnet), mutation lifecycle timestamps, scheduler address
- Known limitations and incomplete items
- **Never** include private keys, mnemonics, RPC API secrets, or wallet recovery phrases

---

## 19. Official References (Verify Before Coding/Deploying)

- Monad docs: https://docs.monad.xyz/
- Monad testnet network facts: https://docs.monad.xyz/developer-essentials/network-information/testnet
- Monad Foundry template: https://github.com/monad-developers/foundry-monad
- Typewriter repo: https://github.com/monad-developers/typewriter
- Typewriter token example: https://github.com/monad-developers/typewriter/blob/main/apps/token/README.md
- Aave V3 testing: https://www.aave.com/docs/aave-v3/smart-contracts/testing-and-debugging
- Aave address book (Sepolia): https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Sepolia.sol

---

## 20. Change History & Future Changes Log

| Timestamp | Workstream / Author | Action / Deliverable | Status / Notes |
|---|---|---|---|
| 2026-11-04 12:49 | All | Initial project memory created from Architecture Revision 2 | Baseline established |
| 2026-11-04 12:53 | Teammate 2 (Agent C) | `feat/aave-typewriter`: Aave V3 Sepolia adapter (`packages/aave-adapter`), Typewriter POC (`apps/typewriter-poc`), `docs/integration-notes.md` | 6/6 tests passing, waiting for merge to main |
| 2026-11-04 13:10 | Teammate 1 (Agent B) | `contracts/`: Implemented `MockSwapTarget.sol`, `MockSwapTarget.t.sol` (10 unit/TOCTOU/fuzz tests), `DeployMockSwapTarget.s.sol`, `foundry.toml`, `deployments/monad-testnet.json` | Contracts and test suite complete |
| 2026-11-04 13:15 | Teammate 1 & Lead | Updated `README.md` and `PROJECT_MEMORY.md` with complete 8-stage architecture flow, accurate progress matrix, and Foundry testing guide | Current setup updated |
| 2026-11-04 13:43 | Teammate 1 (Agent B) | Ran `forge test -vvv` (13/13 tests passed, 256 fuzz runs, 0 failures), formatted with `forge fmt`, verified Monad Testnet RPC chain ID (10143), simulated dry-run deployment via `DeployMockSwapTarget.s.sol` | **All tests & dry-run verified** |
| 2026-11-04 14:24 | Teammate 1 (Agent B) | Deployed `MockSwapTarget` to Monad Testnet (`0xA64c3bA49910baa01515360278AA2542AaAD0219`, Tx: `0x465de4...`, Block: `76872485`). Verified on Sourcify. Created `src/config/monad-contracts.ts`, `packages/contracts-abi`, updated `.env` & `.env.example`, and added `scripts/test-monad-integration.mjs` (10/10 passed) | **Teammate 1 workstream 100% complete** |

### Teammate 1 Status: COMPLETE
- Live Contract Address: `0xA64c3bA49910baa01515360278AA2542AaAD0219`
- Owner: `0x2345ff8Ca8cf8c504F01d26F7064Ef7cb31Dc75D`
- Initial Rate: `1000000000000000000` (1 WAD)
- Verification: [Sourcify Job `23496e23...`](https://sourcify-api-monad.blockvision.org/verify-ui/jobs/23496e23-5297-41f3-89ca-fe5019fb0318)
- Test Command: `npm run test:integration` (All 10 integration checks passing against live Monad RPC)

---

---

## 20. Deterministic Financial Engine Specification (Revision 3 Playbook Analysis)

**Source:** Mobius One-Day Build Playbook — Architecture Revision 3, November 4, 2026  
**Source:** Mobious_Whitepaper_v1.0.docx  
**Status:** Design documented; implementation pending formal specification freeze

### 20.1 Documented Financial Formulations

#### A. Health Factor (simplified explanatory formula)

```
HF ≈ (CollateralAmount × CollateralPrice × LiquidationThreshold) / (DebtAmount × DebtPrice)
```

**IMPORTANT:** This is an explanatory formula, NOT the production implementation.

**Production reference:** `Pool.getUserAccountData(account)` on Aave V3 Sepolia.  
The local financial model must reproduce Aave's actual aggregation, oracle units, token decimals, liquidation thresholds, E-Mode and rounding rules. All local calculations must be tested against on-chain `getUserAccountData` values.

#### B. Risk Envelope (user-defined constraints, enforced by deterministic policy)

| Parameter | Meaning |
|---|---|
| `minHealthFactor` | Minimum acceptable post-action health factor |
| `minStressHealthFactor` | Minimum health factor under specified stress scenarios |
| `maxLeverage` | Maximum permitted leverage |
| `maxDebt` | Maximum permitted outstanding debt |
| `maxSlippageBps` | Maximum tolerated swap slippage |
| `maxInterventionCost` | Maximum intervention cost and capital lock-up penalty |
| `allowedAssets` | Permitted assets |
| `allowedTargets` | Permitted protocol and execution contracts |

**Requirement:** These must be enforced by deterministic policy code. On-chain enforcement where feasible. Never overridable by LLM/agent.

#### C. Cost-Aware Optimization

```
min_{a ∈ A_permitted} [ w_capital × C_capital_lockup(a) + C_execution(a) + C_carry(a) ]
```

Subject to:
```
HF_current(a) ≥ HF_min
HF_stress(a,s) ≥ HF_stress_min
Leverage_after(a) ≤ L_max
Debt_after(a) ≤ Debt_cap
```

All assets, calls, and execution targets must be permitted.

**Key design decisions:**
- Capital locked in collateral, cash spent repaying debt, swap fees, and foregone yield are NOT interchangeable costs.
- Common reporting units required.
- Explicit, versioned weights required.
- Show Pareto comparison when different actions have trade-offs that cannot be reduced to one universal cheapest option.

#### D. Scenario Modelling (reproducible stress scenarios)

| Scenario | Example Input | What Engine Recalculates |
|---|---|---|
| Collateral shock | ETH −5%, −10%, −15% | Position valuation and HF |
| Interest-rate shock | Borrow APY +200 bps over 7 days | Projected debt |
| Liquidity shock | Available depth reduced by 20% | Swap feasibility and repayment proceeds |
| Slippage shock | Maximum slippage increases | Minimum output and candidate feasibility |
| Combined shock | ETH −10%, liquidity −20%, APY +200 bps | Combined position risk |

**Requirement:** These are explicit hypothetical conditions, NOT price predictions. Interest-rate model must account for an explicit time horizon — APY increase does not instantaneously change HF.

### 20.2 Four Cooperating Engine Components

| Component | Input | Process | Output |
|---|---|---|---|
| 1. Transaction Intelligence Engine | Transaction request + chain state | Decode calldata → Read dependencies → Simulate one transaction → Classify failure | Pass/revert, state evidence, failure classification |
| 2. Financial Risk & Repair Engine | Verified position snapshot | Calculate position metrics → Stress-test scenarios → Build candidate actions → Estimate costs | Financially evaluated candidate strategies |
| 3. Agentic Simulation & Policy Engine | Typed candidates + constraints | Simulate alternatives → Check hard constraints → Reject infeasible → Compare feasible | Validated, ranked candidate plans |
| 4. Execution Orchestration Engine | Selected candidate | Fresh-state revalidation → Exact transaction simulation → Authorization → Execution → Settlement verification | Verified execution result + decision receipt |

**Critical Separation:** The LLM does NOT perform trusted financial calculations. Its job is to interpret user objective, coordinate tools, and explain results. Deterministic code calculates financial metrics, generates numerical candidate values, applies policy constraints, and evaluates transaction simulation outcomes.

### 20.3 Financial Engine Modules

| Module | Responsibility | Expected Implementation |
|---|---|---|
| `AaveAdapter` | Read collateral, debt, reserves, prices, configuration | Viem contract reads |
| `PositionModel` | Reconstruct position, calculate HF, leverage, equity | Deterministic TypeScript arithmetic |
| `ScenarioEngine` | Apply price, rate, liquidity shocks | Versioned scenario calculations |
| `CandidateGenerator` | Generate permitted repair alternatives | Rules-based candidate templates |
| `CostEvaluator` | Calculate capital lock-up, execution costs, carry | Fixed-point arithmetic |
| `ConstraintEvaluator` | Enforce user's risk envelope | Hard deterministic checks |
| `SimulationEngine` | Execute candidate transactions against snapshot | `eth_call` + Anvil |
| `PlanOptimizer` | Compare feasible candidates | Constrained search / Pareto ranking |

**Initial Candidate Set (MVP):**
- `HOLD`
- `REPAY_DEBT`
- `ADD_COLLATERAL`
- `SELL_COLLATERAL_AND_REPAY`

Increasing leverage and broader portfolio strategies are excluded from the first MVP.

### 20.4 Missing Specifications (Design Decisions Still Pending)

The following are NOT yet fully specified — they are design decisions requiring formal specification before implementation:

| Missing Specification | Why It Matters |
|---|---|
| Exact multi-asset HF reproduction | Must match Aave's precision and aggregation |
| Debt-index accrual formula | Needed to model changing borrowing rates accurately |
| Leverage and equity definitions | Needed for consistent position comparisons |
| Net carry calculation | Needed to compare borrow costs against collateral yield |
| Swap price-impact model | Needed to estimate sell-to-repay proceeds |
| Cost normalization | Needed to compare capital locked, cash spent, and fees |
| Optimizer algorithm and tie-breaking | Needed for reproducible candidate selection |
| Model calibration and weights | Needed to prevent arbitrary optimization preferences |

**Note:** Whitepaper suggests constrained search or numerical methods, with Model Predictive Control (MPC) as a possible future approach. MPC must be benchmarked against simpler thresholds and fixed policies before claiming superiority.

### 20.5 Recommended Next Step: Freeze Deterministic Financial Engine Specification

Before expanding the product (API Hub, MIP integrations, private settlement), freeze a **Deterministic Financial Engine Specification** containing:

1. Exact formulas and units for position accounting
2. Aave-compatible health-factor and debt-accrual calculations
3. Scenario modelling equations and assumptions
4. Candidate generation and feasibility conditions
5. Cost function definitions and normalization
6. Optimization and tie-breaking logic
7. Golden test cases against Aave contract reads
8. Numerical precision, rounding, and failure-handling rules

**For the three-minute demo:** One reproducible scenario where inputs, formulas, rejected strategies, and selected strategy can all be explained is sufficient. Not every future optimization feature is needed.

### 20.6 Implementation Guidance

- **Single transactions:** Use `eth_call` against a pinned block.
- **Multi-step strategies:** Use isolated Anvil forks. Each candidate executed sequentially against a copy of the same starting state. Multiple remote `eth_call` requests do NOT preserve state between calls.
- **LLM role:** Planner/explainer only. Never trusted for simulation results, gas estimates, state deltas, or financial calculations.
- **On-chain reference:** `Pool.getUserAccountData(account)` on Aave V3 Sepolia is the ground truth for Health Factor validation.

---

## 21. LLM Integration Architecture

**Source:** Mobius One-Day Build Playbook — Architecture Revision 3, November 4, 2026  
**Status:** Implemented with mock provider; OpenAI/Anthropic swap-ready

### 21.1 LLM Role: Optional and Sandboxed

The LLM is **never trusted** with:
- Calculating Health Factors, liquidation distance, or carry
- Deciding whether a simulation passed or reverted
- Guessing oracle prices or protocol parameters
- Overriding hard policy constraints
- Signing or broadcasting transactions

The LLM is **allowed** to:
- Parse natural language into typed `AgenticPlanRequest` (validated by Zod)
- Propose candidate strategies (filtered to allowed deterministic templates)
- Explain deterministic results in human-readable language

### 21.2 Package: `packages/llm-adapter/`

| File | Purpose |
|------|---------|
| `src/types.ts` | `LLMProvider` interface, `LLMConfig` |
| `src/mock-provider.ts` | Mock provider — works without API key (default) |
| `src/intent-parser.ts` | Parses NL → typed request, Zod-validates, merges explicit chainId/account |
| `src/candidate-proposer.ts` | Proposes strategies, falls back to deterministic defaults |
| `src/explainer.ts` | Explains results, falls back to deterministic explainer |

### 21.3 LLM Configuration (`.env`)

```
LLM_ENABLED=false        # Set to "true" to enable LLM features
LLM_PROVIDER=mock        # mock \| groq | openai | anthropic
LLM_MODEL=llama-3.1-8b-instant
LLM_API_KEY=

# Groq (required when LLM_PROVIDER=groq)
GROQ_API_KEY=
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

**Default: disabled.** The mock provider works without any API key and returns deterministic, safe defaults.

To use Groq:
1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Set `LLM_ENABLED=true`, `LLM_PROVIDER=groq`, `GROQ_API_KEY=your_key`
3. Recommended model: `llama-3.1-8b-instant` (fast, cheap) or `llama-3.1-70b-versatile`

### 21.4 API Endpoints

| Endpoint | Method | LLM Role |
|----------|--------|----------|
| `POST /v1/agentic/plan` | POST | LLM explains deterministic results (optional) |
| `POST /v1/agentic/plan/natural` | POST | LLM parses natural language → typed request (Zod-validated) |
| `POST /v1/agentic/revalidate` | POST | LLM explains revalidation result (optional) |

### 21.5 Safety Guarantees

1. **Zod validation:** All LLM output passes through Zod schema before reaching the planner
2. **Strategy filtering:** LLM-proposed strategies are filtered to allowed deterministic templates only
3. **Fallback on failure:** If LLM is disabled or fails, deterministic defaults are used
4. **No trusted calculations:** LLM never produces gas estimates, state deltas, or pass/revert verdicts
5. **Deterministic explainer fallback:** If LLM explanation fails, deterministic explainer takes over

### 21.6 Example Natural Language Flow

User says: *"Execute swap on 0x1234...7890 with 100 ETH and minOut 90"*

1. LLM parses → `{ objective: { type: "execute_swap", description: "..." }, context: { parameters: { amountIn: "100", minOut: "90", target: "0x..." } } }`
2. Zod validates → rejects if chainId/account missing (caller provides them)
3. Deterministic planner simulates swap against pinned snapshot
4. Policy evaluator checks minAmountOut constraint
5. LLM explains: "✅ 1 passed: execute_swap — Swap passed against block 1000"

---

**End of project memory.** This file should be treated as the source of truth for architectural constraints, chain IDs, file ownership, interfaces, non-goals, financial engine specifications, and LLM integration across all sessions.
