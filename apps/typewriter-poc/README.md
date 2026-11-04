# Mobius Typewriter POC

Typewriter execution adapter and mutation lifecycle proof-of-concept for Mobius on Monad.

## Architecture Context

Typewriter sits **after** the Mobius planner, simulation engine, policy evaluator, and revalidation gate. It is an execution adapter for compatible Monad application mutations — not a general-purpose DeFi wrapper.

```
User objective
  → Mobius validates schema & policy
  → Mobius simulates deterministically against pinned snapshot
  → Mobius revalidates state before authorization
  → Wallet signs mutation authorization
  → Typewriter accepts, sequences, and settles the mutation onchain
```

## Status Lifecycle

| Status | Meaning |
|---|---|
| `RECEIVED` | Typewriter server received the signed mutation |
| `ACCEPTED` | Local embedded EVM executed successfully (**preconfirmation, not onchain**) |
| `INCLUDED` | Settlement transaction included in a Monad block |
| `SAFE` | Block passed safe confirmation depth |
| `FINALIZED` | Block passed finalized confirmation depth |

> ⚠️ **`ACCEPTED` ≠ onchain finality.** Never treat local acceptance as a guarantee of inclusion.

## Running the Lifecycle Demo

```bash
cd apps/typewriter-poc
npx tsx src/run-lifecycle-demo.ts
```

## Running the Official Typewriter Sample (Local)

```bash
# Clone upstream in vendor/
mkdir -p vendor
git clone https://github.com/monad-developers/typewriter.git vendor/typewriter
cd vendor/typewriter
bun install

# Start PostgreSQL
docker run --name typewriter-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Run official token example
cd apps/token
cp .env.example .env
# Edit .env: set DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
bun run dev
```

Open `http://localhost:3000` to interact with the official token sample.

## Critical Boundaries

- Typewriter is **not** a generic wrapper for external protocol calls (e.g., Aave).
- Do **not** route Aave Pool supply/borrow through Typewriter on day one.
- Typewriter's `accepted` status is local EVM preconfirmation — not onchain finality.
- Mobius planning, simulation, and policy evaluation must run **before** mutation submission.
