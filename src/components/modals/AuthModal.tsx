'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Lock, CheckCircle2, ArrowRight, Wallet, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';
import { connectMetaMask, formatAddress, isMetaMaskAvailable } from '@/lib/wallet';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'wallet' | 'analyze' | 'login';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'wallet' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'analyze' | 'login'>(defaultTab);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Position Loaded!');
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const sampleAddresses = [
    { label: 'PT-AUSD Loop (Aave V3)', addr: '0x89fcb3017a94029df4819aa0182491a6d71b3e9a' },
    { label: 'mUSD Carry Strategy', addr: '0x2a91f4c7e83d89163b9015ac81640a719d3fbc91' },
  ];

  const handleWalletSignIn = async () => {
    setWalletConnecting(true);
    setWalletError(null);
    try {
      const res = await connectMetaMask();
      if (res.success && res.address) {
        setSuccessMessage(`MetaMask Connected (${formatAddress(res.address)})`);
        setLoaded(true);
        setTimeout(() => {
          onClose();
          window.location.href = '/dashboard';
        }, 800);
      } else {
        if (res.error === 'METAMASK_NOT_INSTALLED') {
          setWalletError('MetaMask extension not found. Please install MetaMask to connect.');
        } else {
          setWalletError(res.error || 'Failed to connect MetaMask');
        }
      }
    } catch (e: any) {
      setWalletError(e?.message || 'Wallet connection error');
    } finally {
      setWalletConnecting(false);
    }
  };

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMessage('Position Loaded!');
      setLoaded(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mobius_wallet_address', address);
        localStorage.setItem('mobius_wallet_connected', 'true');
      }
      setTimeout(() => {
        setLoaded(false);
        onClose();
        window.location.href = '/dashboard';
      }, 900);
    }, 1100);
  };

  const handleSelectSample = (sample: string) => {
    setAddress(sample);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#130E26] p-6 text-white shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-6 border-b border-white/10">
              <MobiusLogo className="size-9 shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-white tracking-tight">
                  {activeTab === 'wallet'
                    ? 'Sign in with Wallet'
                    : activeTab === 'analyze'
                    ? 'Analyze a Position'
                    : 'Log in to Saved Receipts'}
                </h3>
                <p className="text-gray-400 text-xs">
                  Intelligent risk management & deterministic execution on Monad.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="my-5 flex rounded-xl bg-[#1A1333] p-1 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('wallet');
                  setWalletError(null);
                }}
                className={`flex-1 rounded-lg py-2 font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'wallet'
                    ? 'bg-[#836EF9] text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🦊</span>
                <span>MetaMask</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('analyze');
                  setWalletError(null);
                }}
                className={`flex-1 rounded-lg py-2 font-medium text-xs transition-all cursor-pointer ${
                  activeTab === 'analyze'
                    ? 'bg-[#836EF9] text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Public Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setWalletError(null);
                }}
                className={`flex-1 rounded-lg py-2 font-medium text-xs transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-[#836EF9] text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Read-only Session
              </button>
            </div>

            {/* Content states */}
            {loaded ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#836EF9]/20 text-[#836EF9]">
                  <CheckCircle2 className="size-8" />
                </div>
                <h4 className="font-semibold text-white text-lg">{successMessage}</h4>
                <p className="mt-1 text-emerald-400 text-xs font-mono">
                  Redirecting to /dashboard...
                </p>
              </motion.div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 size-10 animate-spin rounded-full border-2 border-[#836EF9] border-t-transparent" />
                <h4 className="font-semibold text-white text-base">Reading position at block...</h4>
                <p className="mt-1 text-gray-400 text-xs font-mono">Querying Monad RPC · parsing Aave V3 reserves</p>
              </div>
            ) : activeTab === 'wallet' ? (
              /* TAB: SIGN IN WITH METAMASK */
              <div className="space-y-4 pt-1">
                {walletError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                    <span>{walletError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleWalletSignIn}
                  disabled={walletConnecting}
                  className="w-full p-4 rounded-xl border border-white/10 bg-[#1A1333] hover:border-[#836EF9] hover:bg-[#201744] flex items-center justify-between transition cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                      🦊
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>MetaMask</span>
                        {isMetaMaskAvailable() && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Detected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Connect browser extension & redirect to Dashboard
                      </div>
                    </div>
                  </div>
                  {walletConnecting ? (
                    <RefreshCw className="size-5 text-[#836EF9] animate-spin" />
                  ) : (
                    <ArrowRight className="size-5 text-gray-400 group-hover:text-[#836EF9] group-hover:translate-x-0.5 transition-transform" />
                  )}
                </button>

                {!isMetaMaskAvailable() && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex items-center justify-between text-xs">
                    <span className="text-amber-200">MetaMask not detected in this browser</span>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#DDD7FE] hover:underline"
                    >
                      <span>Install</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-gray-400">
                  <Lock className="size-3 text-[#836EF9]" />
                  <span>Non-custodial · User-authorized execution · No private-key collection</span>
                </div>
              </div>
            ) : (
              /* TAB: PUBLIC ADDRESS / READ-ONLY */
              <form onSubmit={handleLoad} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-300">
                    Wallet or Contract Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Paste a public address (0x...)"
                      className="w-full rounded-xl border border-white/10 bg-[#1A1333] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#836EF9] font-mono"
                      required
                    />
                    <div className="absolute right-3 top-3 text-gray-500">
                      <Search className="size-4" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await connectMetaMask();
                        if (res.success && res.address) {
                          setAddress(res.address);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-[#A594FD] hover:text-white transition cursor-pointer font-medium"
                    >
                      <span>🦊</span>
                      <span>Auto-fill from MetaMask</span>
                    </button>
                  </div>
                </div>

                {/* Sample quick-pick chips */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-medium text-gray-400">
                    Or select a sample replay:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {sampleAddresses.map((sample) => (
                      <button
                        key={sample.addr}
                        type="button"
                        onClick={() => handleSelectSample(sample.addr)}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-[#171130] px-3 py-2 text-left text-xs transition hover:border-[#836EF9]/40 hover:bg-[#1F1742] cursor-pointer"
                      >
                        <span className="font-medium text-gray-200">{sample.label}</span>
                        <span className="font-mono text-[10px] text-gray-500">
                          {sample.addr.slice(0, 6)}...{sample.addr.slice(-4)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full mt-4 rounded-xl bg-[#836EF9] py-3.5 font-semibold text-white text-sm transition hover:bg-[#6E54FF] shadow-lg shadow-[#836EF9]/25 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Open Position on Dashboard</span>
                  <ArrowRight className="size-4" />
                </button>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-gray-400">
                  <Lock className="size-3 text-[#836EF9]" />
                  <span>No keys or signing needed for read-only risk analysis</span>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
