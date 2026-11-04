#!/usr/bin/env node

/**
 * Mobius Monad Testnet Contract & Frontend Integration Test
 * Verifies live contract connectivity, state, simulation methods, and frontend config sync.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const EXPECTED_CHAIN_ID = 10143;
const CONTRACT_ADDRESS = '0xA64c3bA49910baa01515360278AA2542AaAD0219';
const EXPECTED_OWNER = '0x2345ff8ca8cf8c504f01d26f7064ef7cb31dc75d';

// JSON-RPC Helper
async function rpcCall(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 Mobius Monad Testnet Integration & Verification Suite`);
  console.log(`======================================================`);
  console.log(`Network:          Monad Testnet (${RPC_URL})`);
  console.log(`Target Contract:  ${CONTRACT_ADDRESS}`);
  console.log(`------------------------------------------------------\n`);

  // 1. Verify RPC Chain ID
  console.log(`1. Verifying Chain ID...`);
  const chainIdHex = await rpcCall('eth_chainId');
  const chainId = parseInt(chainIdHex, 16);
  assert(chainId === EXPECTED_CHAIN_ID, `eth_chainId matches ${EXPECTED_CHAIN_ID} (got ${chainId})`);

  // 2. Verify Contract Bytecode exists at Address
  console.log(`\n2. Verifying Contract Code on Monad...`);
  const code = await rpcCall('eth_getCode', [CONTRACT_ADDRESS, 'latest']);
  assert(code && code !== '0x' && code.length > 50, `Contract bytecode exists at ${CONTRACT_ADDRESS} (${code.length / 2 - 1} bytes)`);

  // 3. Verify Owner
  console.log(`\n3. Verifying Contract State: owner()...`);
  // selector for owner() is 0x8da5cb5b
  const ownerRaw = await rpcCall('eth_call', [{ to: CONTRACT_ADDRESS, data: '0x8da5cb5b' }, 'latest']);
  const ownerAddress = '0x' + ownerRaw.slice(-40).toLowerCase();
  assert(ownerAddress === EXPECTED_OWNER, `Owner matches deployer ${EXPECTED_OWNER} (got ${ownerAddress})`);

  // 4. Verify RateWad
  console.log(`\n4. Verifying Contract State: rateWad()...`);
  // selector for rateWad() is 0xde8d2dab
  const rateRaw = await rpcCall('eth_call', [{ to: CONTRACT_ADDRESS, data: '0xde8d2dab' }, 'latest']);
  const rateWad = BigInt(rateRaw);
  assert(rateWad === 1000000000000000000n, `rateWad is 1e18 (1.0 WAD) (got ${rateWad.toString()})`);

  // 5. Verify Quote Calculation
  console.log(`\n5. Verifying View Method: quote(amountIn = 100 MON)...`);
  // selector for quote(uint256) is 0xed1bd76c
  // 100 ether = 100 * 10^18 = 0x56bc75e2d63100000
  const input100Hex = (100n * 10n ** 18n).toString(16).padStart(64, '0');
  const quoteData = '0xed1bd76c' + input100Hex;
  const quoteRaw = await rpcCall('eth_call', [{ to: CONTRACT_ADDRESS, data: quoteData }, 'latest']);
  const quoteOut = BigInt(quoteRaw);
  assert(quoteOut === 100n * 10n ** 18n, `quote(100 ether) returns 100 ether at rate 1.0 (got ${quoteOut.toString()})`);

  // 6. Verify Simulation: swap(100 MON, minOut = 100 MON) -> PASS
  console.log(`\n6. Simulating Valid Swap: swap(100 ether, minOut = 100 ether)...`);
  // selector for swap(uint256,uint256) is 0xd96073cf
  const swapValidData = '0xd96073cf' + input100Hex + input100Hex;
  const swapResult = await rpcCall('eth_call', [
    { to: CONTRACT_ADDRESS, data: swapValidData, from: EXPECTED_OWNER },
    'latest',
  ]);
  const swapOut = BigInt(swapResult);
  assert(swapOut === 100n * 10n ** 18n, `Simulated swap passed with output ${swapOut.toString()}`);

  // 7. Verify Simulation: swap(100 MON, minOut = 105 MON) -> REVERT SlippageExceeded
  console.log(`\n7. Simulating Slippage Exceeded Revert: swap(100 ether, minOut = 105 ether)...`);
  const input105Hex = (105n * 10n ** 18n).toString(16).padStart(64, '0');
  const swapRevertData = '0xd96073cf' + input100Hex + input105Hex;
  let revertCaught = false;
  try {
    await rpcCall('eth_call', [
      { to: CONTRACT_ADDRESS, data: swapRevertData, from: EXPECTED_OWNER },
      'latest',
    ]);
  } catch (err) {
    revertCaught = true;
    assert(true, `Simulated call reverted deterministically as expected (${err.message})`);
  }
  if (!revertCaught) {
    assert(false, `Expected swap with minOut > actual to revert, but call succeeded`);
  }

  // 8. Verify Frontend Configuration Sync
  console.log(`\n8. Checking Frontend Configuration File Sync...`);
  const frontendConfigContent = readFileSync(resolve(ROOT_DIR, 'src/config/monad-contracts.ts'), 'utf-8');
  assert(
    frontendConfigContent.includes(CONTRACT_ADDRESS),
    `src/config/monad-contracts.ts contains deployed address ${CONTRACT_ADDRESS}`
  );

  const deploymentsJsonContent = readFileSync(resolve(ROOT_DIR, 'deployments/monad-testnet.json'), 'utf-8');
  assert(
    deploymentsJsonContent.includes(CONTRACT_ADDRESS),
    `deployments/monad-testnet.json contains deployed address ${CONTRACT_ADDRESS}`
  );

  const envContent = readFileSync(resolve(ROOT_DIR, '.env'), 'utf-8');
  assert(
    envContent.includes(CONTRACT_ADDRESS),
    `.env contains MOCK_SWAP_TARGET_ADDRESS=${CONTRACT_ADDRESS}`
  );

  console.log(`\n======================================================`);
  console.log(`Integration Test Results: ${passed} / ${total} Checks Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`======================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(`\n❌ Integration Test Error:`, err);
  process.exit(1);
});
