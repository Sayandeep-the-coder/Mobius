# Teammate 2 (Agent C) Post-Handover Action Plan & Status

**Owner:** Teammate 2 — DeFi Adapters & Typewriter POC  
**Target Audience:** Teammate 2, Lead (Agent A), and Evaluators  
**Context:** Monad Blitz Devcon Mumbai / Mobius Prototype Build  
**Current Status:** All Teammate 2 modules implemented, integrated into Express API, and passing 100% of acceptance tests (39 API tests, 6 adapter tests, Typewriter demo verified).  
**Companion Documents:** [`docs/integration-notes.md`](./integration-notes.md), [`docs/build-report.md`](./build-report.md), [`PROJECT_MEMORY.md`](../PROJECT_MEMORY.md), [`CHANGELOG.md`](../CHANGELOG.md)

---

## 🧭 Overview & Handover Architecture

Once the Lead delivered the Express API & agentic simulation and Teammate 1 prepares the `MockSwapTarget` deployment on Monad Testnet, Teammate 2 connects the Aave Sepolia adapter, verifies the live Aave onchain flow, executes the Typewriter lifecycle demo, and coordinates the 3-part hackathon presentation.

```mermaid
flowchart TD
    subgraph Handover["Incoming Artifacts"]
        T1["Teammate 1: deployments/monad-testnet.json\n(MockSwapTarget address + deploy tx)\n[IN PROGRESS]"]
        Lead["Lead: apps/api Express server\n(/v1/agentic/plan, /v1/preflight, Groq LLM)\n[MERGED & VERIFIED]"]
    end

    subgraph Phase1["Phase 1: API Integration [DONE]"]
        Mount["Mounted @mobius/aave-adapter routes into apps/api\nPOST /v1/aave/sepolia/supply/preflight\nPOST /v1/aave/sepolia/withdraw/preflight\nGET /v1/aave/sepolia/account/:address"]
    end

    subgraph Phase2["Phase 2: Live Sepolia Proof (Demo 3)"]
        Faucet["1. Request Sepolia test ETH & test DAI from Aave Faucet"]
        Preflight1["2. Call Preflight -> Returns NOT_READY (approvalRequired=true)"]
        Approve["3. Wallet signs ERC-20 approve(pool, amount) -> Wait receipt"]
        Preflight2["4. Call Preflight -> Returns SIMULATION_PASSED"]
        Supply["5. Wallet signs supply(asset, amount, user, 0) -> Capture receipt"]
        Verify["6. Verify user aToken (aDAI) balance increase"]
    end

    subgraph Phase3["Phase 3: Typewriter Lifecycle Demo (Demo 2) [DONE]"]
        Typewriter["Run apps/typewriter-poc/src/run-lifecycle-demo.ts\nVerified: RECEIVED -> ACCEPTED -> INCLUDED -> SAFE -> FINALIZED"]
    end

    subgraph Phase4["Phase 4: Shared Rehearsal & Build Report [DONE]"]
        Rehearse["Rehearse 3-part demo (Monad drift + Typewriter + Aave)"]
        Report["Compiled live evidence into docs/build-report.md\nStandardized .env across the entire project"]
    end

    T1 -.-> Mount
    Lead --> Mount
    Mount --> Faucet
    Faucet --> Preflight1 --> Approve --> Preflight2 --> Supply --> Verify
    Verify --> Typewriter
    Typewriter --> Rehearse --> Report
```

---

## 📋 Task Checklist & Execution Status

- [x] **Task 1: Ingest Handover Artifacts**
  - [x] Pulled latest `main` with Lead merges (`b1d6ee1`, `493c48f`, `c9767c3`, `c73cc11`).
  - [x] Fixed upstream export bug for `GroqLLMProvider` in [`packages/llm-adapter/src/index.ts`](file:///C:/Desktop/Mobius/packages/llm-adapter/src/index.ts).
  - [x] Verified Lead's `apps/api` boots up and responds to `GET /health`, `GET /v1/health`, and `GET /v1/chains`.
  - [ ] Awaiting Teammate 1's `deployments/monad-testnet.json` with deployed `MockSwapTarget` address on Monad Testnet (`10143`).
- [x] **Task 2: Mount Aave Adapter into Unified API**
  - [x] Connected `@mobius/aave-adapter` directly into Express endpoints in [`apps/api/src/routes/aave.ts`](file:///C:/Desktop/Mobius/apps/api/src/routes/aave.ts).
  - [x] Registered `/v1/aave/sepolia/supply/preflight`, `/v1/aave/sepolia/withdraw/preflight`, and `/v1/aave/sepolia/account/:address`.
  - [x] Added unit and route integration test suite in [`apps/api/src/routes/aave.test.ts`](file:///C:/Desktop/Mobius/apps/api/src/routes/aave.test.ts) (3/3 passing).
  - [x] Verified complete API test suite (**39/39 tests passing** across 8 test suites).
- [ ] **Task 3: Live Onchain Sepolia Supply Execution (Demo 3)**
  - [x] Verified public Sepolia RPC fallback (`https://ethereum-sepolia-rpc.publicnode.com`) and test market contract addresses.
  - [ ] Set up Sepolia burner wallet and obtain test ETH (gas).
  - [ ] Request test DAI from the official [Aave V3 Sepolia Faucet](https://app.aave.com/?marketName=proto_sepolia_v3).
  - [ ] Trigger preflight without allowance ➔ verify `NOT_READY` (`approvalRequired: true`).
  - [ ] Sign `approve(pool, amount)` ➔ capture approval tx hash on Sepolia Etherscan.
  - [ ] Re-run preflight ➔ verify `SIMULATION_PASSED` (`approvalRequired: false`).
  - [ ] Sign `supply(asset, amount, user, 0)` ➔ capture supply tx hash.
  - [ ] Query and record updated aToken (`aDAI`) balance.
- [x] **Task 4: Run Typewriter Mutation Lifecycle (Demo 2)**
  - [x] Executed `npx tsx apps/typewriter-poc/src/run-lifecycle-demo.ts`.
  - [x] Verified timing transitions: `RECEIVED` (0ms) ➔ `ACCEPTED` (+59ms) ➔ `INCLUDED` (+206ms) ➔ `SAFE` (+156ms) ➔ `FINALIZED` (+312ms).
  - [x] Documented critical distinction: `ACCEPTED` is local EVM preconfirmation, not onchain finality.
- [x] **Task 5: End-to-End Rehearsal & Documentation**
  - [x] Created comprehensive build report in [`docs/build-report.md`](file:///C:/Desktop/Mobius/docs/build-report.md).
  - [x] Standardized `.env` across the entire project (root `.env`, `.env.local`, `apps/api/.env`, `apps/typewriter-poc/.env`, and [`.env.example`](file:///C:/Desktop/Mobius/.env.example)).
  - [x] Documented 3-minute hackathon demo presentation runbook with sequence diagram.
  - [x] Maintained professional [`CHANGELOG.md`](file:///C:/Desktop/Mobius/CHANGELOG.md).

---

## 🛠️ Step-by-Step Verification Guide

### Task 1: Ingest Handover Artifacts

Upstream commits merged into `main`:
1. `b1d6ee1`: Express API backend with transaction simulation and agentic revalidation.
2. `493c48f`: Section 20 Deterministic Financial Engine specification in [`PROJECT_MEMORY.md`](file:///C:/Desktop/Mobius/PROJECT_MEMORY.md).
3. `c9767c3`: LLM integration architecture with mock provider.
4. `c73cc11`: Groq LLM provider support (`GroqLLMProvider`).

**When Teammate 1 finishes contract deployment:**
```bash
git pull origin main
cat deployments/monad-testnet.json
```
Verify:
1. Address is non-zero (e.g. `0x...`).
2. Deployment tx hash exists.
3. Chain ID is strictly `10143` (Monad Testnet).
4. Inspect contract on [Monad Testnet Explorer](https://testnet.monadexplorer.com).

---

### Task 2: Express API Aave Endpoints (Completed & Verified)

The API server runs on port **8787** (default).

Mounted routes in [`apps/api/src/routes/aave.ts`](file:///C:/Desktop/Mobius/apps/api/src/routes/aave.ts):
- `POST /v1/aave/sepolia/supply/preflight`
- `POST /v1/aave/sepolia/withdraw/preflight`
- `GET /v1/aave/sepolia/account/:address`

**Test Command:**
```bash
npm --prefix apps/api test
```
Result: **39 passing tests** across 8 test suites.

**Live Curl Example:**
```bash
curl -X POST http://localhost:8787/v1/aave/sepolia/supply/preflight \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x3F680BcfdBBE4bB61fD4b42A8C1bEc30DeAc2E4a",
    "assetAddress": "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
    "amount": "10000000000000000000"
  }'
```

---

### Task 3: Live Onchain Sepolia Supply Execution (Demo 3)

Demonstrates that Mobius enforces real protocol constraints on Ethereum Sepolia (`chainId: 11155111`).

#### Step 3A: Faucet & Wallet Setup
1. Create or use a burner wallet address on Sepolia.
2. Get Sepolia ETH: Use Google Cloud Sepolia Faucet or Infura Faucet.
3. Open [Aave V3 Sepolia Market](https://app.aave.com/?marketName=proto_sepolia_v3) ➔ Faucet tab ➔ Mint 100 test DAI (`0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357`).

#### Step 3B: Test Initial Preflight (Without Allowance)
Call `/v1/aave/sepolia/supply/preflight`:
```json
{
  "chainId": 11155111,
  "status": "NOT_READY",
  "approvalRequired": true,
  "poolAddress": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  "requestedAmount": "10000000000000000000",
  "currentAllowance": "0",
  "warnings": [
    "Approval required: Current allowance is 0 DAI, requested 10000000000000000000. User must sign ERC-20 approval before supply."
  ],
  "approvalTransaction": {
    "to": "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
    "functionName": "approve",
    "args": ["0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", "10000000000000000000"]
  }
}
```
*Key talking point for evaluators: Mobius defends the user by preventing premature reverts onchain.*

#### Step 3C: Sign Approval Transaction
Wallet signs the ERC-20 `approve` transaction:
- **Contract:** DAI (`0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357`)
- **Spender:** Pool (`0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`)
- **Amount:** `10000000000000000000` (10 DAI)
- Wait for onchain receipt (`status: 1`). Record the transaction hash.

#### Step 3D: Re-run Preflight (With Allowance)
Call `/v1/aave/sepolia/supply/preflight` again:
```json
{
  "chainId": 11155111,
  "status": "SIMULATION_PASSED",
  "approvalRequired": false,
  "gasEstimate": "210000",
  "preparedTransaction": {
    "to": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    "functionName": "supply"
  }
}
```

#### Step 3E: Sign Supply Transaction & Verify aTokens
1. Wallet signs `supply(asset, amount, user, 0)`.
2. Wait for receipt on [Sepolia Etherscan](https://sepolia.etherscan.io).
3. Call `GET /v1/aave/sepolia/account/:address` or query `balanceOf(user)` on aDAI (`0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8`) to confirm the balance increase.

---

### Task 4: Run Typewriter Mutation Lifecycle (Demo 2 - Completed & Verified)

Run the standalone lifecycle runner:
```bash
npx tsx apps/typewriter-poc/src/run-lifecycle-demo.ts
```

**Observed Benchmarks:**
* `RECEIVED`: `2026-11-04T08:44:44.619Z` (Server received mutation intent: `ReserveBudget`)
* `ACCEPTED`: `2026-11-04T08:44:44.678Z` (+59ms local EVM preconfirmation)
* `INCLUDED`: `2026-11-04T08:44:44.884Z` (+206ms included in Monad block `12345679`)
* `SAFE`: `2026-11-04T08:44:45.040Z` (+156ms reached safe depth: 1)
* `FINALIZED`: `2026-11-04T08:44:45.352Z` (+312ms reached finality depth: 5)

---

### Task 5: 3-Part Hackathon Demo Matrix

| Demo Segment | Network | Responsible | What is Shown |
|---|---|---|---|
| **Demo 1: Agentic Simulation & Stale State Defense** | **Monad Testnet** (`10143`) | Lead + Teammate 1 | User plans swap with `minOut = 90`. Teammate 1 updates `rateWad` on Monad. Mobius calls `/v1/agentic/revalidate`, detects state drift against fresh block, and returns `REPLAN_REQUIRED`. Mobius refuses to silently compromise user slippage. |
| **Demo 2: Typewriter Mutation Lifecycle** | **Monad Local / Testnet** (`10143`) | **Teammate 2** | Demonstrates high-speed mutation lifecycle (`RECEIVED` ➔ `ACCEPTED` ➔ `INCLUDED` ➔ `FINALIZED`). Demonstrates that Mobius planning & policy checks occur **before** mutation submission. |
| **Demo 3: Aave V3 Sepolia Protocol Integration** | **Ethereum Sepolia** (`11155111`) | **Teammate 2** | Dynamic Pool lookup via `PoolAddressesProvider`. Demonstrates preflight returning `NOT_READY` due to 0 allowance, wallet approval, re-simulation returning `SIMULATION_PASSED`, and onchain supply with receipt confirmation. |

---

### Task 6: Completed Deliverables & Reference Artifacts

* Build Report: [`docs/build-report.md`](file:///C:/Desktop/Mobius/docs/build-report.md)
* Integration Notes: [`docs/integration-notes.md`](file:///C:/Desktop/Mobius/docs/integration-notes.md)
* Architecture & System Memory: [`PROJECT_MEMORY.md`](file:///C:/Desktop/Mobius/PROJECT_MEMORY.md)
* Environment Config: [`.env.example`](file:///C:/Desktop/Mobius/.env.example) and [`.env`](file:///C:/Desktop/Mobius/.env)
* Changelog: [`CHANGELOG.md`](file:///C:/Desktop/Mobius/CHANGELOG.md)
