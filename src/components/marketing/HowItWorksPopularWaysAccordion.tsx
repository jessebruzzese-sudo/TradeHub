'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function HowItWorksPopularWaysAccordion({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative mx-auto max-w-6xl px-4 mt-10 md:mt-14">
      {/* Blue box header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-full text-left"
        aria-expanded={open}
      >
        <div className="relative overflow-hidden rounded-2xl bg-blue-600 px-6 py-10 text-white shadow-sm">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)',
              backgroundSize: '18px 18px',
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute right-0 bottom-0">
            <img
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              className="hidden h-24 w-auto opacity-15 md:block"
              aria-hidden
            />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center pointer-events-none">
            <img
              src="/tradehub-horizontal-white-tagline.svg"
              alt="TradeHub"
              className="mb-4 h-16 w-auto md:h-10"
            />
            <h2 className="text-2xl font-bold md:text-3xl">
              Popular ways trade businesses use TradeHub
            </h2>
            <p className="mt-2 max-w-2xl text-blue-100">
              Whether you&apos;re overbooked or quiet, TradeHub helps you stay flexible and keep crews moving — without lead fees.
            </p>
          </div>

          {/* Mobile-only CTA row */}
          <div className="relative z-10 mt-6 flex items-center justify-center gap-2 md:hidden pointer-events-none">
            <span className="text-sm font-semibold text-white/95">See more</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Accordion content: MOBILE ONLY */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-6 space-y-6">
          {children}
        </div>
      </div>

      {/* Desktop: always show the cards normally */}
      <div className="hidden md:block mt-12">
        <div className="grid gap-8 md:grid-cols-3">
          {children}
        </div>
      </div>
    </section>
  );
}
