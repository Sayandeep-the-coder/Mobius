'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Lock, CheckCircle2, ShieldCheck, ArrowRight, Database } from 'lucide-react';
import { MobiusLogo } from '@/components/common/MobiusLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'analyze' | 'login';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'analyze' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'analyze' | 'login'>(defaultTab);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const sampleAddresses = [
    { label: 'PT-AUSD Loop (Aave V3)', addr: '0x89fcb3017a94029df4819aa0182491a6d71b3e9a' },
    { label: 'mUSD Carry Strategy', addr: '0x2a91f4c7e83d89163b9015ac81640a719d3fbc91' },
  ];

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLoaded(true);
      setTimeout(() => {
        setLoaded(false);
        onClose();
      }, 1200);
    }, 1400);
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
                  {activeTab === 'analyze' ? 'Analyze a Position' : 'Log in to Saved Receipts'}
                </h3>
                <p className="text-gray-400 text-xs">
                  Read-only risk rehearsal. No seed phrases. No keys. No signing.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="my-5 flex rounded-xl bg-[#1A1333] p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('analyze')}
                className={`flex-1 rounded-lg py-2 font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === 'analyze'
                    ? 'bg-[#836EF9] text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Enter Public Address
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 rounded-lg py-2 font-medium text-xs sm:text-sm transition-all cursor-pointer ${
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
                <h4 className="font-semibold text-white text-lg">Position Loaded!</h4>
                <p className="mt-1 text-gray-400 text-xs font-mono">
                  Data fresh · block 12,345,678 · 4s ago
                </p>
              </motion.div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 size-10 animate-spin rounded-full border-2 border-[#836EF9] border-t-transparent" />
                <h4 className="font-semibold text-white text-base">Reading position at block...</h4>
                <p className="mt-1 text-gray-400 text-xs font-mono">Querying Monad RPC · parsing Aave V3 reserves</p>
              </div>
            ) : (
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
                  <span>Load position</span>
                  <ArrowRight className="size-4" />
                </button>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-gray-400">
                  <Lock className="size-3 text-[#836EF9]" />
                  <span>No wallet connection. No keys. Just a public address.</span>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
