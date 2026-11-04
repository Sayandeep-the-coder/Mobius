/**
 * Mobius Web3 Wallet Integration
 * Production-ready MetaMask & Injected Provider connector with Monad Testnet support.
 */

export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_HEX = '0x279f';

export const MONAD_CHAIN_PARAMS = {
  chainId: MONAD_TESTNET_HEX,
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};

export interface WalletState {
  address: string | null;
  shortAddress: string;
  chainId: number | null;
  isMonad: boolean;
  balance: string | null;
  isConnected: boolean;
  isMetaMask: boolean;
}

/**
 * Returns the Ethereum provider injected into the window.
 * If multiple extensions are installed (MetaMask, Rabby, Coinbase),
 * it prioritizes MetaMask if requested.
 */
export function getEthereumProvider(): any | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;
  if (!anyWin.ethereum) return null;

  // Handle multiple providers array injected by extensions
  if (Array.isArray(anyWin.ethereum.providers)) {
    const mm = anyWin.ethereum.providers.find((p: any) => p.isMetaMask && !p.isRabby);
    if (mm) return mm;
    return anyWin.ethereum.providers[0];
  }

  return anyWin.ethereum;
}

/**
 * Check if MetaMask extension is detected
 */
export function isMetaMaskAvailable(): boolean {
  const provider = getEthereumProvider();
  return Boolean(provider && (provider.isMetaMask || typeof provider.request === 'function'));
}

/**
 * Format 42-character address to 0x1234...5678
 */
export function formatAddress(address?: string | null): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format balance in Wei hex/string into human-readable MON/ETH
 */
export function formatBalance(weiHexOrStr?: string | null): string {
  if (!weiHexOrStr) return '0.000';
  try {
    const wei = BigInt(weiHexOrStr);
    const divisor = BigInt(10 ** 18);
    const whole = wei / divisor;
    const remainder = wei % divisor;
    // Format 3 decimal places
    const decimals = remainder.toString().padStart(18, '0').slice(0, 3);
    return `${whole}.${decimals}`;
  } catch {
    return '0.000';
  }
}

/**
 * Request connection to MetaMask and retrieve accounts, chainId, and balance
 */
export async function connectMetaMask(): Promise<{
  success: boolean;
  address?: string;
  shortAddress?: string;
  chainId?: number;
  balance?: string;
  error?: string;
}> {
  const provider = getEthereumProvider();
  if (!provider) {
    return {
      success: false,
      error: 'METAMASK_NOT_INSTALLED',
    };
  }

  try {
    const accounts: string[] = await provider.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'NO_ACCOUNTS_RETURNED' };
    }

    const address = accounts[0];
    const chainIdHex = await provider.request({ method: 'eth_chainId' }).catch(() => '0x0');
    const chainId = parseInt(chainIdHex, 16);

    let balance = '0.000';
    try {
      const balHex = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      balance = formatBalance(balHex);
    } catch {}

    // Persist session
    if (typeof window !== 'undefined') {
      localStorage.setItem('mobius_wallet_address', address);
      localStorage.setItem('mobius_wallet_connected', 'true');
    }

    return {
      success: true,
      address,
      shortAddress: formatAddress(address),
      chainId,
      balance,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'User rejected wallet connection',
    };
  }
}

/**
 * Switches active MetaMask chain to Monad Testnet (Chain ID 10143)
 * Prompts user to add Monad Testnet if not yet configured in MetaMask.
 */
export async function switchToMonadTestnet(): Promise<boolean> {
  const provider = getEthereumProvider();
  if (!provider) return false;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_TESTNET_HEX }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 error code means the network is not yet in user's MetaMask
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [MONAD_CHAIN_PARAMS],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Monad Testnet to MetaMask:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Monad Testnet:', switchError);
    return false;
  }
}

/**
 * Silently restore existing connection if already granted
 */
export async function checkExistingConnection(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const isMarkedConnected = localStorage.getItem('mobius_wallet_connected') === 'true';
  const savedAddress = localStorage.getItem('mobius_wallet_address');
  if (!isMarkedConnected || !savedAddress) return null;

  const provider = getEthereumProvider();
  if (!provider) return savedAddress;

  try {
    const accounts: string[] = await provider.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
  } catch {}

  return savedAddress;
}

/**
 * Disconnect wallet and remove saved state
 */
export function disconnectWallet(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mobius_wallet_address');
    localStorage.removeItem('mobius_wallet_connected');
  }
}

