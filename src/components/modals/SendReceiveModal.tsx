'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface SendReceiveModalProps {
  type: 'send' | 'receive' | null;
  onClose: () => void;
  onSuccess?: (amount: string, token: string) => void;
}

export function SendReceiveModal({ type, onClose, onSuccess }: SendReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState('MON');
  const [amount, setAmount] = useState('250');
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const myAddress = '0x71C...monad';

  const handleCopy = () => {
    navigator.clipboard?.writeText('0x71C8A3628e21bc49a7102e34589d9c');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      if (onSuccess) onSuccess(amount, token);
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <AnimatePresence>
      {type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#130E26] p-6 text-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {type === 'receive' ? (
              <div>
                <div className="flex items-center gap-2.5 pb-4">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#836EF9]/20 text-[#836EF9]">
                    <ArrowDownLeft className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">Receive Confidential Assets</h3>
                    <p className="text-gray-400 text-xs">Share your confidential Monad address or QR code</p>
                  </div>
                </div>

                {/* QR Code Placeholder with Monad styling */}
                <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white p-6">
                  <div className="flex size-44 items-center justify-center rounded-xl border border-gray-200 bg-white p-2">
                    <svg viewBox="0 0 100 100" className="size-full text-black">
                      <rect width="100" height="100" fill="#fff" />
                      {/* Corner 1 */}
                      <rect x="10" y="10" width="24" height="24" fill="#000" />
                      <rect x="14" y="14" width="16" height="16" fill="#fff" />
                      <rect x="18" y="18" width="8" height="8" fill="#000" />
                      {/* Corner 2 */}
                      <rect x="66" y="10" width="24" height="24" fill="#000" />
                      <rect x="70" y="14" width="16" height="16" fill="#fff" />
                      <rect x="74" y="18" width="8" height="8" fill="#000" />
                      {/* Corner 3 */}
                      <rect x="10" y="66" width="24" height="24" fill="#000" />
                      <rect x="14" y="70" width="16" height="16" fill="#fff" />
                      <rect x="18" y="74" width="8" height="8" fill="#000" />
                      {/* Center dots Monad Purple */}
                      <rect x="42" y="42" width="16" height="16" fill="#836EF9" rx="3" />
                      <circle cx="50" cy="50" r="4" fill="#fff" />
                      {/* Random QR bits */}
                      <rect x="38" y="14" width="6" height="6" fill="#000" />
                      <rect x="48" y="24" width="8" height="6" fill="#000" />
                      <rect x="14" y="44" width="8" height="8" fill="#000" />
                      <rect x="70" y="44" width="10" height="6" fill="#000" />
                      <rect x="44" y="70" width="12" height="6" fill="#000" />
                      <rect x="70" y="70" width="8" height="8" fill="#000" />
                    </svg>
                  </div>
                  <span className="mt-3 font-mono font-medium text-black text-xs">{myAddress}</span>
                </div>

                {/* Copy address box */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1A1333] p-3">
                  <span className="font-mono text-gray-300 text-xs">0x71C8A3628e21bc49a7102e34589d9c</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg bg-[#836EF9]/20 px-3 py-1.5 font-medium text-xs text-[#DDD7FE] hover:bg-[#836EF9]/30 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-[#836EF9]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 pb-4">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#836EF9]/20 text-[#836EF9]">
                    <ArrowUpRight className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">Send Privately</h3>
                    <p className="text-gray-400 text-xs">Instant settlement via Monad&apos;s parallel engine</p>
                  </div>
                </div>

                {sent ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#836EF9]/20 text-[#836EF9]">
                      <Check className="size-8" />
                    </div>
                    <h4 className="font-semibold text-lg text-white">Payment Sent Confidentially!</h4>
                    <p className="mt-1 text-gray-400 text-sm">
                      {amount} {token} routed with 1-second finality.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="space-y-4 pt-2">
                    {/* Amount & Token */}
                    <div className="rounded-xl border border-white/10 bg-[#1A1333] p-4">
                      <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
                        <span>Amount</span>
                        <span>Available: 3,850 MON</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-transparent font-semibold text-2xl text-white outline-none"
                          placeholder="0.00"
                          required
                        />
                        <select
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          className="rounded-lg border border-white/10 bg-[#251B47] px-3 py-1.5 font-medium text-sm text-white outline-none"
                        >
                          <option value="MON">MON (Monad)</option>
                          <option value="USDC">USDC</option>
                          <option value="BTC">BTC</option>
                          <option value="ETH">ETH</option>
                          <option value="SOL">SOL</option>
                        </select>
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-gray-300 text-xs">Recipient Address or ENS</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. vitalik.eth, monad.eth, or 0x..."
                        className="w-full rounded-xl border border-white/10 bg-[#1A1333] p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#836EF9]"
                        required
                      />
                    </div>

                    {/* Mode Notice */}
                    <div className="rounded-xl border border-[#836EF9]/30 bg-[#836EF9]/10 p-3 text-xs text-[#DDD7FE]">
                      <p className="font-semibold text-white">Confidential Routing Active</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">
                        The recipient receives exact funds without seeing your other balances or wallet history.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full rounded-xl bg-[#836EF9] py-3.5 font-semibold text-white text-sm transition hover:bg-[#6E54FF] shadow-lg shadow-[#836EF9]/25 disabled:opacity-50 cursor-pointer"
                    >
                      {sending ? 'Processing Confidential Payment...' : `Send ${amount} ${token}`}
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
