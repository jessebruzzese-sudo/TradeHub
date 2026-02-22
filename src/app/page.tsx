'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MarketingHeader } from '@/components/marketing-header';
import { HeroCard } from '@/components/marketing/HeroCard';
import { ProofBar } from '@/components/marketing/ProofBar';
import { WhyTiles } from '@/components/marketing/WhyTiles';
import { HowItWorksBand } from '@/components/marketing/HowItWorksBand';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
        {/* Hero */}
        <section className="mb-6">
          <HeroCard />
        </section>

        {/* Proof bar */}
        <section className="mb-10">
          <ProofBar />
        </section>

        {/* Why tradies choose TradeHub */}
        <WhyTiles />

        {/* How it works */}
        <HowItWorksBand />

        {/* Final CTA */}
        <FinalCTA />
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/TradeHub  -Mark-Main.svg"
                alt="TradeHub"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-sm text-gray-600">
                © 2024 TradeHub. Australian construction marketplace.
              </span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
