'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FaqItem {
  id: number;
  question: string;
  answer: React.ReactNode;
}

const faqs: FaqItem[] = [
  {
    id: 1,
    question: 'What is Mobius?',
    answer:
      'Mobius is a read-only risk rehearsal tool for leveraged DeFi positions on Monad. It shows how a position behaves under rate, price and peg shocks, compares your possible next moves, and gives you a receipt of how each result was calculated.',
  },
  {
    id: 2,
    question: 'Does Mobius hold or move my funds?',
    answer:
      'No. Mobius never takes custody, never asks for keys or a seed phrase, and never signs a transaction. You review the recommendation and act yourself in the protocol’s own app.',
  },
  {
    id: 3,
    question: 'Which positions does Mobius support?',
    answer: (
      <span>
        The first release focuses on one strategy: a PT-AUSD loop on Aave V3 on Monad. More markets will follow once the first one is tested with real users.{' '}
        <span className="text-xs font-mono text-amber-600 block mt-1">
          [VERIFY: confirm the live market and maturity before launch]
        </span>
      </span>
    ),
  },
  {
    id: 4,
    question: 'How does Mobius calculate health factor?',
    answer:
      'With the protocol’s own method: collateral value, liquidation thresholds, oracle prices and E-Mode rules, read at a single block. The result is checked against protocol reference values. The receipt shows every input and formula.',
  },
  {
    id: 5,
    question: 'What does the AI (Jev) actually do?',
    answer:
      'It only ranks actions that code has already approved, or flags a case for review. It never calculates your health factor or yield, never invents data, and never authorizes a transaction. If it is unsure or unavailable, Mobius falls back to rules-only.',
  },
  {
    id: 6,
    question: 'Does Mobius prevent liquidation?',
    answer:
      'No. Mobius helps you see modeled risk and compare responses, but it cannot guarantee any outcome. Results depend on markets, protocol rules, liquidity and your own actions.',
  },
  {
    id: 7,
    question: 'Why does the demo use a saved snapshot?',
    answer:
      'So anyone can try Mobius without funds or a wallet. The demo replays a recorded position at an exact block. Sample and replay data are always labelled.',
  },
  {
    id: 8,
    question: 'What is a decision receipt?',
    answer:
      'A downloadable record of one recommendation: the source block, inputs, formulas, rejected actions and why, model version and result. You can recompute the arithmetic without trusting an AI explanation.',
  },
  {
    id: 9,
    question: 'Can my protocol or team integrate Mobius?',
    answer: (
      <span>
        Yes, we’re looking for design partners.{' '}
        <a href="mailto:partners@mobius.xyz" className="text-[#836EF9] underline hover:text-[#6E54FF] font-semibold">
          Reach out via Contact support.
        </a>
      </span>
    ),
  },
  {
    id: 10,
    question: 'Need help?',
    answer:
      'Send us a note and we’ll get back to you.',
  },
];

export function FaqSection() {
  const [openIds, setOpenIds] = useState<number[]>([1]);

  const toggleFaq = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section id="faq" className="mx-auto w-full max-w-7xl divide-y divide-black/10 border-black/10 border-x max-xl:border-none">
      {/* Header */}
      <header className="flex flex-col items-start gap-4 px-6 pt-24 pb-16 sm:px-8 sm:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#836EF9]/30 bg-[#836EF9]/10 px-3.5 py-1 text-xs font-semibold text-[#836EF9]">
          <span className="size-2 rounded-full bg-[#836EF9]" />
          Knowledge Base
        </div>
        <h2 className="text-balance font-medium text-3xl/9 text-gray-900 tracking-tight lg:text-[2.5rem]/10">
          Frequently asked questions
        </h2>
        <p className="text-balance font-medium text-gray-500 text-lg/7">
          Can’t find your answer? Send us a note, and we’ll be in touch.
        </p>
        <button
          type="button"
          onClick={() => window.open('mailto:support@mobius.xyz')}
          className="mt-2 rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-sm text-gray-900 transition hover:border-[#836EF9] hover:text-[#836EF9] hover:bg-[#836EF9]/5 active:scale-97 cursor-pointer"
        >
          Contact support
        </button>
      </header>

      {/* Accordion Questions */}
      <div className="divide-y divide-black/10 border-black/10 border-b">
        {faqs.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className={`relative transition-colors duration-150 ${isOpen ? 'bg-[#836EF9]/5' : 'hover:bg-gray-50/50'}`}
            >
              <button
                type="button"
                onClick={() => toggleFaq(faq.id)}
                className="group relative z-10 flex w-full items-start justify-between gap-4 px-6 py-6 text-left transition-[padding] duration-150 focus-visible:outline-none sm:px-8 cursor-pointer"
              >
                <span className={`font-semibold text-lg sm:text-xl/7 tracking-tight transition-colors ${isOpen ? 'text-[#836EF9]' : 'text-gray-900'}`}>
                  {faq.question}
                </span>
                <span className="inline-flex h-7 shrink-0 items-center justify-center">
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus className={`size-5 transition-colors ${isOpen ? 'text-[#836EF9]' : 'text-gray-900'}`} />
                  </motion.div>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="max-w-4xl px-6 pb-6 font-medium text-sm sm:text-base/6 text-gray-600 sm:px-8">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Star tile mask separator */}
      <div className="near-star-tile-mask mask-repeat mask-size-[21px_21px] h-32 bg-black/5" />
    </section>
  );
}
