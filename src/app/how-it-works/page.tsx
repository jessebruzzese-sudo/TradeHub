import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Gauge, BadgeCheck, Users } from 'lucide-react';

import { MarketingHeader } from '@/components/marketing-header';
import { HowItWorksPopularWaysAccordion } from '@/components/marketing/HowItWorksPopularWaysAccordion';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'How TradeHub Works | TradeHub Australia',
  description:
    'Run your trade business like your own agency. Find more work, fill schedule gaps, and connect with Plumbing, Electrical, Carpentry and more — without lead fees.',
};

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50">
      <div className="relative z-10">
        <MarketingHeader />
        <main className="relative overflow-hidden bg-transparent">
          {/* Hero-style background (dotted + glow) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#0f172a_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_60%)] md:h-[720px] md:w-[720px] md:-top-48" />
          </div>

          <div className="relative">
            {/* Clean top title area */}
            <section className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
              <div className="flex flex-col items-center gap-3 text-center">
                <img src="/tradehub-mark.svg" alt="TradeHub" className="h-12 w-12 md:h-14 md:w-14" />
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                  How it works
                </h1>
                <p className="max-w-xl text-base text-slate-600 md:text-lg">
                  Three steps to more booked days.
                </p>
                <p className="mt-4 max-w-3xl text-center text-base text-slate-600 md:text-lg">
                  Operate like your own agency — list availability, get discovered locally, and turn conversations into real jobs. No lead fees.
                </p>
              </div>
            </section>

            {/* 3 steps section */}
            <section className="mt-14">
              <div className="mx-auto max-w-5xl px-4">
                <div className="grid gap-10 md:grid-cols-3">

                  {/* Step 1 */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white text-lg font-bold shadow-md">
                      1
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">
                      Create your profile
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 md:text-base">
                      Add your trade, service area, and availability.
                      Control how and when you appear.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold shadow-md">
                      2
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">
                      Get discovered
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 md:text-base">
                      Businesses searching by trade and suburb
                      see you instantly — no lead fees.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-white text-lg font-bold shadow-md">
                      3
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">
                      Win work
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 md:text-base">
                      Message directly, apply to jobs,
                      and build repeat relationships.
                    </p>
                  </div>

                </div>
              </div>
            </section>

            {/* Popular ways */}
            <HowItWorksPopularWaysAccordion>
              <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:shadow-md">
                <div className="relative h-24 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1690719095815-549c60090c9f?auto=format&fit=crop&w=1600&q=80"
                    alt="Timber roof truss construction, Clyde North VIC"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                    <Gauge className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Control your workload</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      <li>• Fill gaps in schedule to have consistent workload</li>
                      <li>• Offload overflow when you&apos;re fully booked</li>
                      <li>• Stay productive without lead fees</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:shadow-md">
                <div className="relative h-24 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1700529289398-dd313f11c9cc?auto=format&fit=crop&w=1600&q=80"
                    alt="Tradie installing solar panels, Cairns QLD"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                    <BadgeCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Work with real businesses</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      <li>• Network with more tradies</li>
                      <li>• Direct messaging, no middleman</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:shadow-md">
                <div className="relative h-24 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1676803210608-39cdef6a505c?auto=format&fit=crop&w=1600&q=80"
                    alt="House framing under construction"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Become your own agency</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      <li>• Contract out apprentices</li>
                      <li>• Scale beyond just yourself</li>
                      <li>• Operate like a professional subcontracting business</li>
                    </ul>
                  </div>
                </div>
              </div>
            </HowItWorksPopularWaysAccordion>

            {/* Quick Questions - no boxed container, Q bold + larger */}
            <section className="relative mx-auto max-w-6xl px-4 py-12 mt-10 md:mt-14">
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Quick questions</h2>
              <div className="mt-6 space-y-4">
                <details className="group rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-slate-900 md:text-xl">
                    Is TradeHub a lead-selling marketplace?
                    <span className="ml-3 text-slate-400 transition group-open:rotate-180">⌄</span>
                  </summary>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 md:text-base">
                    No — TradeHub is built to connect trade businesses directly without the &quot;pay per lead&quot; race-to-the-bottom model.
                  </p>
                </details>

                <details className="group rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-slate-900 md:text-xl">
                    Can I use it to find more work nearby?
                    <span className="ml-3 text-slate-400 transition group-open:rotate-180">⌄</span>
                  </summary>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 md:text-base">
                    Yes — your profile and availability help local businesses discover you when they need your trade.
                  </p>
                </details>

                <details className="group rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-slate-900 md:text-xl">
                    Does it work for Plumbing, Electrical, Carpentry?
                    <span className="ml-3 text-slate-400 transition group-open:rotate-180">⌄</span>
                  </summary>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 md:text-base">
                    Absolutely — TradeHub is designed around real trade categories and local matching.
                  </p>
                </details>

                <details className="group rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-slate-900 md:text-xl">
                    How do I get started?
                    <span className="ml-3 text-slate-400 transition group-open:rotate-180">⌄</span>
                  </summary>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 md:text-base">
                    Create your account, set your trade(s) and location, then list availability or respond to opportunities.
                  </p>
                </details>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/signup">
                    Create account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            </section>
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
              <div className="mt-3 flex justify-center gap-6 text-sm md:mt-0 md:text-base">
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
