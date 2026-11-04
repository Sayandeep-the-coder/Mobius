# Changelog

All notable changes to the **Mobius** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-11-04

### Added
- **Express API Aave V3 Routing & Preflight Integration (`apps/api`)**:
  - Connected live `@mobius/aave-adapter` client directly into Express endpoints (`apps/api/src/routes/aave.ts`):
    - `POST /v1/aave/sepolia/supply/preflight`: Executes token validation, allowance checks, approval calldata generation, and Viem EVM simulation via `runSupplyPreflight`.
    - `POST /v1/aave/sepolia/withdraw/preflight`: Validates aToken balances and simulates receipt token burn/redemption via `runWithdrawPreflight`.
    - `GET /v1/aave/sepolia/account/:address`: Queries live user account data (`totalCollateralBase`, `totalDebtBase`, `availableBorrowsBase`, `currentLiquidationThreshold`, `ltv`, `healthFactor`) via `getUserAccountData`.
  - Added unit test suite in `apps/api/src/routes/aave.test.ts` (3/3 passing tests verifying input validation, bad address handling, and error handling with mock clients).
  - Enriched `AaveSupplyPreflightResponse` and `AaveWithdrawPreflightResponse` in `packages/contracts-abi/src/aave.ts` with typed `gasEstimate`, `preparedTransaction`, `approvalTransaction`, and `caveat` fields.

- **Aave V3 Sepolia Protocol Adapter (`packages/aave-adapter`)**:
  - Implemented `AaveSepoliaClient` with strict chain verification (`chainId: 11155111` / Ethereum Sepolia) and runtime failure for network mismatches.
  - Dynamic Pool resolution via official `PoolAddressesProvider` (`0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A`), verifying onchain bytecode (`getCode !== "0x"`).
  - Built token metadata reader for `symbol`, `decimals`, `balanceOf`, and `allowance` to prevent floating-point precision loss.
  - Implemented `runSupplyPreflight`:
    - Enforces a mandatory two-step gate: returns `NOT_READY` with `approvalRequired: true` whenever current allowance is lower than requested deposit amount.
    - Runs Viem `simulateContract` with user address as sender once approved, providing gas estimates and pre-built calldata for wallet signing.
  - Implemented `runWithdrawPreflight`:
    - Queries `ProtocolDataProvider` (`0x3e9708d80f7B3e43118013075F7e95CE3AB31F31`) for receipt aToken balances (`aDAI`: `0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8`).
    - Simulates `Pool.withdraw` against pinned snapshot state.
  - Automated acceptance test suite in `packages/aave-adapter/test/aave-adapter.test.ts` (6/6 passing tests covering address validation, allowance gates, and simulation paths).

- **Typewriter Mutation Execution Adapter & POC (`apps/typewriter-poc`)**:
  - Configured Monad Testnet (`chainId: 10143`, block polling 200ms, FIFO ordering, submit interval 300ms) and local Anvil environments.
  - Built `TypewriterAdapter` tracking the complete mutation lifecycle:
    - `RECEIVED`: Server receives user-signed mutation.
    - `ACCEPTED`: Embedded local EVM pre-execution successful (preconfirmation).
    - `INCLUDED`: Batch settled in an onchain Monad block.
    - `SAFE`: Reached safe block depth (`depth: 1`).
    - `FINALIZED`: Reached finality depth (`depth: 5`).
  - Enforced critical architecture boundary: documented that `ACCEPTED` is local EVM preconfirmation and does not equal onchain finality; external DeFi calls are isolated from Typewriter mutations.
  - Added runnable lifecycle demo script (`apps/typewriter-poc/src/run-lifecycle-demo.ts`).

- **Integration Documentation & Context Memory (`docs/integration-notes.md`)**:
  - Detailed product identity, team ownership matrix (Teammate 2 / Agent C), and non-negotiable chain ground truth.
  - Official address registry from the Aave V3 Sepolia Address Book.
  - Step-by-step wallet interaction runbooks and acceptance checklist.

- **Post-Handover Task Runbook (`docs/post-handover-tasks.md`)**:
  - Step-by-step verification checklist for smart contract deployment artifacts from Lead / Teammate 1.
  - Monad testnet explorer inspection guide for `MockSwapTarget` and `LiquidationBufferPool`.
  - Live Sepolia Aave interaction procedure and test recording schema.

### Changed
- Resolved monorepo Viem dependency version conflicts by standardizing on `viem@^2.21.0` in root `package.json` and eliminating duplicate sub-package lockfile variants.
- Configured path aliases in `apps/api/tsconfig.json` and `apps/api/vitest.config.ts` to include `@mobius/aave-adapter` and `@mobius/llm-adapter`.
- Resolved TypeScript strict null checks and interface alignments in `@mobius/llm-adapter`.
- Configured root `tsconfig.json` to exclude sub-packages (`packages/**`, `apps/**`) so that sub-packages utilize independent `ES2022` compiler targets with native BigInt support while keeping the Next.js root configuration unaffected.

---

## [0.1.0] - 2026-11-04

### Added
- **Interactive Risk Rehearsal Web Application**:
  - Built complete Next.js 16 frontend with Turbopack, Tailwind CSS v4, Framer Motion, and Lucide React.
  - **Hero Dashboard & Live Mockup**:
    - Live health factor monitor (1.03), collateral breakdown ($250,000), debt ($230,000), liquidation distance (≈ 290 bps), and net carry (+12.4% APR).
    - Block freshness indicator pinned to block `12,345,678`.
    - Interactive "Run shock" simulation drawer and cryptographic JSON receipt export with toast notification.
  - **Interactive Feature Accordion**:
    - 7 expandable risk-rehearsal modules covering real position reads, combined shocks, liquidation distance, next move comparison (Hold / Repay / Unwind / Roll), Telegram alerts, and protocol overlays.
    - Interactive right-side rehearsal card with real-time `AUSD depeg` slider (0 bps to 500 bps) and instant recalculation.
  - **Safety Architecture & Trust Pillars**:
    - Read-only by design overview (no keys, no custody, math you can verify).
    - Token marquee featuring `MON`, `AUSD`, `USDC`, `USDT0`, `GHO`, `mUSD`, `PT-AUSD`, `AAVE`, and `PENDLE`.
  - **Infrastructure & FAQ**:
    - 4-step execution orchestration diagram and tech stack indicators (Monad, Aave V3, Pendle, TypeSafe Jev, Viem, Supabase).
    - 10 comprehensive FAQ accordion items detailing read-only guarantees, verifiable receipts, and non-custodial constraints.
  - **Asset Library**:
    - Custom twisted Möbius strip SVG brand mark and favicon in Monad purple (`#836EF9`).
    - Complete token, market, and partner SVG graphic assets in `public/static/`.

- **Architecture Revision 2 & Persistent Memory (`PROJECT_MEMORY.md`)**:
  - Established 685-line authoritative project memory document covering system architecture, chain configurations, EVM simulation mechanics, team ownership boundaries, and one-day definition of done.
  - Defined strict responsibility boundaries: deterministic risk engine handles numbers, EVM handles simulation, and wallet handles signing. AI never invents financial figures.

- **Developer Setup & Getting Started**:
  - Added comprehensive "How to Set Up in Your Device" section to `README.md` covering prerequisites, cloning, dependencies, environment variables, development server, and production builds.

### Changed
- Updated root `.gitignore` to seamlessly integrate ignore rules for both Next.js artifacts (`/.next/`, `/out/`, `/build`, `.vercel/`, `next-env.d.ts`, `*.tsbuildinfo`) and smart contract / Foundry / Typewriter files (`out/`, `cache/`, `artifacts/`, `.broadcast/`, `lib/`, `vendor/`, `typewriter/`).

---

## [0.0.1] - 2026-11-03

### Added
- Initial project fork from `monad-developers/monad-blitz-devcon-mumbai`.
- Devcon Mumbai submission process templates and reference documentation.
