'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { HeroCard } from '@/components/marketing/HeroCard';
import { HowItWorksBand } from '@/components/marketing/HowItWorksBand';
import { useAuth } from '@/lib/auth';
import { safeRouterPush } from '@/lib/safe-nav';

export default function HomePage() {
  const [heroOpen, setHeroOpen] = useState(false);
  const router = useRouter();
  const { session } = useAuth();
  const isAuthed = !!session?.user;

  const handleJoinFree = () => {
    if (isAuthed) {
      safeRouterPush(router, '/dashboard', '/dashboard');
      return;
    }
    safeRouterPush(router, '/signup', '/signup');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Dotted overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden
      />

      {/* Watermark (bottom-right, large, subtle) */}
      <div className="pointer-events-none absolute bottom-0 right-0 z-0">
        <img
          src="/TradeHub-Mark-blackout.svg"
          alt=""
          aria-hidden="true"
          className="h-[1600px] w-[1600px] opacity-[0.06]"
        />
      </div>

      {/* Page Content */}
      <div className="relative z-10">
      <main className="relative min-h-screen overflow-hidden bg-transparent">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 md:space-y-8 md:py-5">
        {/* Desktop: Logo with tagline - always visible */}
        <div className="hidden md:block">
          <div className="py-4 md:py-6 text-center">
            <img
              src="/tradehub-horizontal-main-tagline.svg"
              alt="TradeHub"
              className="mx-auto h-16 w-auto sm:h-20"
            />
            <p className="mt-1 text-gray-600 text-sm md:text-base">
              Connecting Aussie trades. No lead fees. Get booked locally.
            </p>
          </div>
        </div>

        {/* Hero (watermark lives ONLY inside this section) - bg-white on mobile kills grey strip */}
        <section className="relative overflow-hidden bg-white md:bg-transparent">
          {/* Watermark (scrolls with page, fades out before lower sections) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden
              [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_78%)]
              [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_78%)]"
          >
            <img
              src="/TradeHub-Mark-blackout.svg"
              alt=""
              className="hidden md:block absolute -top-10 -right-40 w-[1100px] max-w-none select-none opacity-[0.07] mix-blend-multiply"
            />
          </div>

          {/* Content above watermark */}
          <div className="relative z-10">
            {/* Hero + proof bar (with glow) */}
            <div className="relative mt-4 md:mt-0">
              {/* Hero glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[-140px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_60%)] md:top-[-180px] md:h-[720px] md:w-[720px]"
              />
              {/* Soft fade-out so glow doesn't bleed down - transparent on mobile to avoid grey strip behind logo */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-[320px] h-24 bg-transparent md:bg-gradient-to-b md:from-transparent md:to-slate-50"
              />

              {/* Mobile: Horizontal logo above blue hero card */}
              <div className="bg-transparent shadow-none ring-0 [background:none] [background-image:none] md:[background-image:var(--tw-bg-image)] md:hidden px-4 pt-2">
                <div className="bg-transparent shadow-none ring-0 [background:none] [background-image:none] mx-auto w-fit">
                  <img
                    src="/tradehub-horizontal-tagline.svg"
                    alt="TradeHub — Connecting trades, simply"
                    className="block w-[340px] max-w-full bg-transparent"
                  />
                </div>

                {/* Extra line under the logo (mobile only) */}
                <p className="mt-2 text-center text-sm text-slate-600">
                  Connecting Aussie trades. No lead fees. Get booked locally.
                </p>
              </div>

              {/* Mobile: Minimal hero with collapsible details */}
              <div className="mt-4 md:mt-0">
                <HeroCard
                  mobileMinimal
                  heroOpen={heroOpen}
                  onHeroToggle={() => setHeroOpen((v) => !v)}
                  detailsPrefix={null}
                />
              </div>

              {/* Desktop: Full hero */}
              <HeroCard />
            </div>
          </div>
        </section>

        {/* How it works */}
        <HowItWorksBand />

        {/* Desktop: Ready to get booked? CTA card */}
        <div className="hidden md:block mt-12">
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <img
                src="/tradehub-horizontal-main-tagline.svg"
                alt="TradeHub"
                className="h-10 w-auto object-contain"
              />
              <h3 className="mt-3 text-3xl font-extrabold text-slate-900">Ready to get booked?</h3>
              <p className="mt-2 text-sm text-slate-600">
                20km free radius. No credit card. Australia-wide.
              </p>

              <button
                type="button"
                onClick={handleJoinFree}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Join free
              </button>
            </div>
          </div>
        </div>

        {/* Join free pill (mobile only) */}
        <div className="mt-8 flex justify-center md:hidden">
          <button
            type="button"
            onClick={handleJoinFree}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
          >
            Join free
          </button>
        </div>
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
    </div>
  );
}
