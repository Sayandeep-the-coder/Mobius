#!/usr/bin/env node
/**
 * 🔗 WalletConnect Agent - dApp Access for AI
 * Connect to any Web3 dApp via WalletConnect v2 and auto-sign transactions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { ethers } = require('ethers');
const { Core } = require('@walletconnect/core');
const { Web3Wallet } = require('@walletconnect/web3wallet');

// ─── SECURITY CHECK #1: Refuse --private-key as command line argument ───────
if (process.argv.some(arg => arg.toLowerCase().startsWith('--private-key'))) {
  console.error('\x1b[31m[SECURITY ERROR]\x1b[0m Passing --private-key as an argument is forbidden because it is stored in shell history.');
  console.error('Please set the PRIVATE_KEY environment variable instead:');
  console.error('  export PRIVATE_KEY="0x..."');
  console.error('  node scripts/wc-connect.js "wc:..."');
  process.exit(1);
}

// ─── SECURITY CHECK #2: Check PRIVATE_KEY environment variable ──────────────
const rawPrivateKey = process.env.PRIVATE_KEY?.trim();
if (!rawPrivateKey) {
  console.error('\x1b[31m[ERROR]\x1b[0m PRIVATE_KEY environment variable not set.');
  console.error('Set it before running:');
  console.error('  export PRIVATE_KEY="0x..."');
  process.exit(1);
}

const privateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;

// ─── CLI Options & Defaults ──────────────────────────────────────────────────
const args = process.argv.slice(2);
let targetUri = null;
let chainId = parseInt(process.env.CHAIN_ID || '8453', 10);
let customRpc = process.env.RPC_URL || null;
let interactive = false;
let auditEnabled = true;
let allowEthSign = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--interactive') {
    interactive = true;
  } else if (arg === '--no-audit') {
    auditEnabled = false;
  } else if (arg === '--allow-eth-sign') {
    allowEthSign = true;
  } else if (arg === '--chain-id' && args[i + 1]) {
    chainId = parseInt(args[++i], 10);
  } else if (arg === '--rpc' && args[i + 1]) {
    customRpc = args[++i];
  } else if (arg.startsWith('wc:')) {
    targetUri = arg;
  }
}

if (!targetUri) {
  console.error('\x1b[33m[USAGE]\x1b[0m node scripts/wc-connect.js "<wc_uri>" [options]');
  console.error('Options:');
  console.error('  --chain-id <id>     Target chain ID (default: 8453 Base, 10143 Monad Testnet)');
  console.error('  --rpc <url>         Custom JSON-RPC URL');
  console.error('  --interactive       Prompt confirmation before signing each request');
  console.error('  --no-audit          Disable audit logging to ~/.walletconnect-agent/audit.log');
  console.error('  --allow-eth-sign    Enable dangerous eth_sign method (blocked by default)');
  process.exit(1);
}

// Known default RPCs
const RPC_BY_CHAIN = {
  1: 'https://eth.llamarpc.com',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10143: 'https://testnet-rpc.monad.xyz',
};

const rpcUrl = customRpc || RPC_BY_CHAIN[chainId] || 'https://mainnet.base.org';
const projectId = process.env.WC_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64';

// ─── Setup Wallet & Provider ────────────────────────────────────────────────
let provider;
try {
  provider = new ethers.JsonRpcProvider(rpcUrl);
} catch (e) {
  console.warn(`[WARN] Could not connect to RPC ${rpcUrl}:`, e.message);
}

const wallet = new ethers.Wallet(privateKey, provider);
const walletAddress = wallet.address;
const maskedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

// ─── Audit Logger ────────────────────────────────────────────────────────────
const auditDir = path.join(os.homedir(), '.walletconnect-agent');
const auditFile = path.join(auditDir, 'audit.log');

function logAudit(event, data = {}) {
  if (!auditEnabled) return;
  try {
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
      try {
        fs.chmodSync(auditDir, 0o700);
      } catch {}
    }
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      account: maskedAddress,
      chainId,
      ...data,
    };
    fs.appendFileSync(auditFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err.message);
  }
}

// ─── Interactive Prompt Helper ───────────────────────────────────────────────
function askUserConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`\x1b[33m? ${question} (y/N): \x1b[0m`, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

// ─── Main Execution ─────────────────────────────────────────────────────────
async function run() {
  console.log('\n\x1b[35m════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[36m🔗 WalletConnect Agent - dApp Access for AI\x1b[0m');
  console.log('\x1b[35m════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`• Wallet Address: \x1b[32m${maskedAddress}\x1b[0m (full: ${walletAddress})`);
  console.log(`• Target Chain:   \x1b[34mEIP155:${chainId}\x1b[0m (${rpcUrl})`);
  console.log(`• Signing Mode:   \x1b[33m${interactive ? 'INTERACTIVE (Prompt per request)' : 'AUTO-APPROVE (Autonomous)'}\x1b[0m`);
  console.log(`• eth_sign:       ${allowEthSign ? '\x1b[31mALLOWED (--allow-eth-sign enabled)\x1b[0m' : '\x1b[32mBLOCKED (Safe default)\x1b[0m'}`);
  console.log(`• Audit Logging:  ${auditEnabled ? `\x1b[32mENABLED (${auditFile})\x1b[0m` : '\x1b[33mDISABLED\x1b[0m'}`);
  console.log('\x1b[35m────────────────────────────────────────────────────────────────────\x1b[0m\n');

  logAudit('connection_attempt', { uriSnippet: targetUri.slice(0, 15) + '...' });

  const core = new Core({ projectId });
  const web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: 'WalletConnect Agent (AI)',
      description: 'Autonomous Web3 Agent Signer',
      url: 'https://mobius.markets',
      icons: ['https://mobius.markets/icon.svg'],
    },
  });

  // ── Session Proposal Handler ──────────────────────────────────────────────
  web3wallet.on('session_proposal', async (proposal) => {
    const { id, params } = proposal;
    const proposerName = params.proposer?.metadata?.name || 'Unknown dApp';
    console.log(`\x1b[36m[SESSION PROPOSAL]\x1b[0m Received proposal from: \x1b[1m${proposerName}\x1b[0m (${params.proposer?.metadata?.url || 'No URL'})`);

    const requestedChains = params.requiredNamespaces?.eip155?.chains || [];
    const optionalChains = params.optionalNamespaces?.eip155?.chains || [];
    const allChains = Array.from(new Set([...requestedChains, ...optionalChains, `eip155:${chainId}`]));

    const supportedMethods = [
      'personal_sign',
      'eth_signTypedData',
      'eth_signTypedData_v4',
      'eth_sendTransaction',
      'eth_sendRawTransaction',
    ];
    if (allowEthSign) {
      supportedMethods.push('eth_sign');
    }

    const accounts = allChains.map((c) => `${c}:${walletAddress}`);

    if (interactive) {
      const approve = await askUserConfirmation(`Approve session proposal from "${proposerName}"?`);
      if (!approve) {
        console.log('\x1b[31m[SESSION REJECTED]\x1b[0m Rejected session proposal.');
        logAudit('session_rejected', { proposer: proposerName, reason: 'user_denied' });
        await web3wallet.rejectSession({ id, reason: { code: 5000, message: 'User rejected session proposal' } });
        return;
      }
    }

    try {
      const session = await web3wallet.approveSession({
        id,
        namespaces: {
          eip155: {
            accounts,
            methods: supportedMethods,
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      });
      console.log(`\x1b[32m[SESSION APPROVED]\x1b[0m Connected to: \x1b[1m${proposerName}\x1b[0m! (Session Topic: ${session.topic.slice(0, 10)}...)`);
      logAudit('session_approved', { proposer: proposerName, topic: session.topic.slice(0, 10) + '...' });
    } catch (err) {
      console.error('\x1b[31m[SESSION APPROVAL ERROR]\x1b[0m', err.message);
      logAudit('session_error', { error: err.message });
    }
  });

  // ── Session Request Handler ───────────────────────────────────────────────
  web3wallet.on('session_request', async (event) => {
    const { topic, params, id } = event;
    const { request, chainId: reqChainId } = params;
    const method = request.method;

    console.log(`\n\x1b[36m[REQUEST]\x1b[0m Incoming \x1b[1m${method}\x1b[0m request for \x1b[34m${reqChainId || 'eip155:' + chainId}\x1b[0m (ID: ${id})`);
    logAudit('sign_request', { method, reqChainId });

    // 1. Check for eth_sign guardrail
    if (method === 'eth_sign') {
      if (!allowEthSign) {
        console.error('\x1b[31m[SECURITY BLOCKED]\x1b[0m The dangerous "eth_sign" method was requested and blocked.');
        console.error('eth_sign allows arbitrary signing and is blocked by default. Pass --allow-eth-sign to override.');
        logAudit('sign_blocked', { method: 'eth_sign', reason: 'blocked_by_default' });
        await web3wallet.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: '2.0',
            error: { code: 4001, message: 'Dangerous eth_sign method is blocked for security. Use personal_sign or typedData.' },
          },
        });
        return;
      }
    }

    try {
      let result;

      // 2. Handle personal_sign
      if (method === 'personal_sign') {
        const rawMessage = request.params[0];
        let displayMessage = rawMessage;
        try {
          if (ethers.isHexString(rawMessage)) {
            displayMessage = ethers.toUtf8String(rawMessage);
          }
        } catch {}

        console.log('\x1b[33mMessage content:\x1b[0m\n' + displayMessage);

        if (interactive) {
          const approved = await askUserConfirmation('Sign this personal message?');
          if (!approved) {
            console.log('\x1b[31m[REJECTED]\x1b[0m User denied signing.');
            await web3wallet.respondSessionRequest({
              topic,
              response: { id, jsonrpc: '2.0', error: { code: 4001, message: 'User rejected signing' } },
            });
            logAudit('sign_rejected', { method });
            return;
          }
        }

        const msgToSign = ethers.isHexString(rawMessage) ? ethers.getBytes(rawMessage) : rawMessage;
        result = await wallet.signMessage(msgToSign);
        console.log(`\x1b[32m[SIGNED]\x1b[0m Signature: ${result.slice(0, 16)}...`);
        logAudit('sign_success', { method });
      }

      // 3. Handle eth_signTypedData / eth_signTypedData_v4
      else if (method === 'eth_signTypedData' || method === 'eth_signTypedData_v4') {
        const rawData = request.params[1] || request.params[0];
        const typedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

        console.log('\x1b[33mTyped Data Domain:\x1b[0m', JSON.stringify(typedData.domain, null, 2));
        console.log('\x1b[33mTyped Data Message:\x1b[0m', JSON.stringify(typedData.message, null, 2));

        if (interactive) {
          const approved = await askUserConfirmation('Sign this EIP-712 typed data?');
          if (!approved) {
            console.log('\x1b[31m[REJECTED]\x1b[0m User denied typed data signing.');
            await web3wallet.respondSessionRequest({
              topic,
              response: { id, jsonrpc: '2.0', error: { code: 4001, message: 'User rejected typed data signing' } },
            });
            logAudit('sign_rejected', { method });
            return;
          }
        }

        // ethers signTypedData: (domain, types, value)
        const types = { ...typedData.types };
        delete types.EIP712Domain; // ethers expects types without EIP712Domain
        result = await wallet.signTypedData(typedData.domain, types, typedData.message);
        console.log(`\x1b[32m[SIGNED TYPED DATA]\x1b[0m Signature: ${result.slice(0, 16)}...`);
        logAudit('sign_success', { method });
      }

      // 4. Handle eth_sendTransaction
      else if (method === 'eth_sendTransaction') {
        const txParams = request.params[0];
        console.log('\x1b[33mTransaction Details:\x1b[0m');
        console.log(`  To:    ${txParams.to}`);
        console.log(`  Value: ${txParams.value ? ethers.formatEther(BigInt(txParams.value)) + ' ETH/MON' : '0'}`);
        console.log(`  Data:  ${txParams.data?.slice(0, 34)}... (${txParams.data?.length || 0} bytes)`);

        if (interactive) {
          const approved = await askUserConfirmation('Approve and broadcast this on-chain transaction?');
          if (!approved) {
            console.log('\x1b[31m[REJECTED]\x1b[0m User denied transaction.');
            await web3wallet.respondSessionRequest({
              topic,
              response: { id, jsonrpc: '2.0', error: { code: 4001, message: 'User rejected transaction' } },
            });
            logAudit('sign_rejected', { method, to: txParams.to });
            return;
          }
        }

        console.log('\x1b[36m[BROADCASTING]\x1b[0m Sending transaction to network...');
        const tx = await wallet.sendTransaction({
          to: txParams.to,
          data: txParams.data,
          value: txParams.value ? BigInt(txParams.value) : undefined,
          gasLimit: txParams.gas ? BigInt(txParams.gas) : (txParams.gasLimit ? BigInt(txParams.gasLimit) : undefined),
        });

        result = tx.hash;
        console.log(`\x1b[32m[TRANSACTION SENT]\x1b[0m Tx Hash: \x1b[1m${result}\x1b[0m`);
        logAudit('sign_success', { method, txHash: result, to: txParams.to });
      }

      // 5. Unsupported method fallback
      else {
        console.warn(`\x1b[33m[UNSUPPORTED METHOD]\x1b[0m Method "${method}" is not supported.`);
        await web3wallet.respondSessionRequest({
          topic,
          response: { id, jsonrpc: '2.0', error: { code: 4001, message: `Unsupported method ${method}` } },
        });
        logAudit('sign_unsupported', { method });
        return;
      }

      // Respond back to dApp
      await web3wallet.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', result },
      });
    } catch (err) {
      console.error('\x1b[31m[REQUEST ERROR]\x1b[0m Failed to process request:', err.message);
      await web3wallet.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', error: { code: 5000, message: err.message } },
      }).catch(() => {});
      logAudit('sign_failed', { method, error: err.message });
    }
  });

  // ── Pair with URI ─────────────────────────────────────────────────────────
  console.log(`\x1b[36m[PAIRING]\x1b[0m Pairing with WalletConnect URI...`);
  try {
    await web3wallet.pair({ uri: targetUri });
    console.log(`\x1b[32m[PAIRED]\x1b[0m Successfully initiated pairing relay! Waiting for dApp requests...`);
    console.log(`\x1b[90m(Press Ctrl+C to disconnect and exit)\x1b[0m\n`);
  } catch (err) {
    console.error(`\x1b[31m[PAIRING FAILED]\x1b[0m ${err.message}`);
    console.error('Tips: WalletConnect URIs expire in ~5 minutes. Ensure the URI is fresh.');
    logAudit('pairing_failed', { error: err.message });
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('\x1b[31m[FATAL ERROR]\x1b[0m', err);
  process.exit(1);
});
