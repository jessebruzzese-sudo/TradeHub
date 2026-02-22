'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { MarketingHeader } from '@/components/marketing-header';
import { HeroCard } from '@/components/marketing/HeroCard';
import { HowItWorksBand } from '@/components/marketing/HowItWorksBand';
import { FinalCTA } from '@/components/marketing/FinalCTA';

const logoWithTagline = (
  <div className="py-4 text-center">
    <img
      src="/tradehub-horizontal-main-tagline.svg"
      alt="TradeHub"
      className="mx-auto h-12 object-contain"
    />
    <p className="mt-1 text-sm text-white/90">
      Connecting Aussie trades. No lead fees. Get booked locally.
    </p>
  </div>
);

export default function HomePage() {
  const [heroOpen, setHeroOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F8FF]">
      <MarketingHeader />

      <main className="relative min-h-screen overflow-hidden bg-[#F5F8FF]">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 md:space-y-8 md:py-5">
        {/* Desktop: Logo with tagline - always visible */}
        <div className="hidden py-4 md:block md:py-6 text-center">
          <img
            src="/tradehub-horizontal-main-tagline.svg"
            alt="TradeHub"
            className="mx-auto h-12 md:h-20 lg:h-24 object-contain"
          />
          <p className="mt-1 text-gray-600 text-sm md:text-base">
            Connecting Aussie trades. No lead fees. Get booked locally.
          </p>
        </div>

        {/* Hero + proof bar (with glow) */}
        <div className="relative">
          {/* Hero glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[-140px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_60%)] md:top-[-180px] md:h-[720px] md:w-[720px]"
          />
          {/* Soft fade-out so glow doesn't bleed down */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[320px] h-24 bg-gradient-to-b from-transparent to-[#F5F8FF]"
          />

          {/* Mobile: Minimal hero with collapsible details */}
          <HeroCard
            mobileMinimal
            heroOpen={heroOpen}
            onHeroToggle={() => setHeroOpen((v) => !v)}
            detailsPrefix={logoWithTagline}
          />

          {/* Desktop: Full hero */}
          <HeroCard />
        </div>

        {/* How it works */}
        <HowItWorksBand />

        {/* Final CTA */}
        <FinalCTA />
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 md:py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/tradehub-mark.svg"
                alt="TradeHub"
                width={32}
                height={32}
                className="h-6 w-6 md:h-8 md:w-8"
              />
              <span className="text-xs text-gray-600 md:text-sm">
                © 2024 TradeHub. Australian construction marketplace.
              </span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-6 text-sm md:mt-0 md:text-base">
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
