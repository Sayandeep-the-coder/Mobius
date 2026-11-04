'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/hero/HeroSection';
import { FeatureAccordion } from '@/components/features/FeatureAccordion';
import { ConfidentialSection } from '@/components/confidential/ConfidentialSection';
import { InfrastructureSection } from '@/components/infrastructure/InfrastructureSection';
import { FaqSection } from '@/components/faq/FaqSection';
import { CtaBanner } from '@/components/cta/CtaBanner';
import { AuthModal } from '@/components/modals/AuthModal';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'wallet' | 'analyze' | 'login'>('wallet');

  const handleOpenAuth = (tab: 'login' | 'signup' | 'wallet') => {
    setModalTab(tab === 'login' ? 'wallet' : 'analyze');
    setModalOpen(true);
  };

  const handleOpenAnalyze = () => {
    setModalTab('analyze');
    setModalOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header onOpenAuth={handleOpenAuth} onOpenAnalyze={handleOpenAnalyze} />

      <main className="flex-1">
        <HeroSection onOpenAnalyze={handleOpenAnalyze} />
        <FeatureAccordion />
        <ConfidentialSection />
        <InfrastructureSection />
        <FaqSection />
        <CtaBanner onOpenAnalyze={handleOpenAnalyze} />
      </main>

      <Footer />

      {/* Global Analyze / Position Modal */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
      />
    </div>
  );
}
