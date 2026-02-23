'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, FileText, MessageSquare, MapPin, Bell, Star } from 'lucide-react';
import Image from 'next/image';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

const FEATURE_CARDS = [
  {
    title: 'View Real Project Tenders',
    items: [
      'Browse live project tenders with uploaded plans and scopes',
      'See suburb/postcode only — no exact addresses',
      'No fake jobs or sold leads',
    ],
    icon: <FileText className="h-6 w-6 text-blue-600" />,
    accent: 'from-sky-400 to-blue-600',
    colSpan2: false,
  },
  {
    title: 'Quote the Work You Want',
    items: [
      'Submit quotes directly to businesses',
      'Free trial quote included to test the platform',
      'Premium subscription — no per-lead fees',
    ],
    icon: <MessageSquare className="h-6 w-6 text-blue-600" />,
    accent: 'from-indigo-400 to-blue-600',
    colSpan2: false,
  },
  {
    title: 'Control Your Radius',
    items: [
      "Set how far you're willing to travel",
      'Only see work within your selected range',
      'Upgrade for unlimited radius if you work across regions',
    ],
    icon: <MapPin className="h-6 w-6 text-blue-600" />,
    accent: 'from-emerald-400 to-teal-600',
    colSpan2: false,
  },
  {
    title: 'Availability & Alerts',
    items: [
      'Turn alerts on to be notified when new tenders match your trade',
      'Premium contractors receive alerts for premium tenders',
      'No spam — alerts are trade and radius-filtered',
    ],
    icon: <Bell className="h-6 w-6 text-blue-600" />,
    accent: 'from-violet-400 to-indigo-600',
    colSpan2: false,
  },
  {
    title: 'Build a Reputation',
    items: [
      'Reliability reviews for late cancellations',
      'Verified profiles build trust with builders',
      'Strong history increases chances of being shortlisted',
    ],
    icon: <Star className="h-6 w-6 text-blue-600" />,
    accent: 'from-amber-400 to-orange-600',
    colSpan2: true,
  },
] as const;

export default function SubcontractorsPage() {
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [wmOffset, setWmOffset] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setWmOffset(window.scrollY * 0.18);
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#2563eb]">
      {/* Global watermark (parallax, behind everything) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Mobile */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 md:hidden opacity-[0.15]">
          <div className="w-[260px] max-w-[80vw]">
            <Image
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              width={520}
              height={520}
              className="h-auto w-full object-contain"
              priority={false}
            />
          </div>
        </div>

        {/* Desktop */}
        <div
          className="absolute bottom-[-12%] right-[-14%] hidden md:block opacity-[0.15] will-change-transform"
          style={{ transform: `translate3d(0, ${wmOffset * 0.35}px, 0)` }}
        >
          <div className="w-[1400px] lg:w-[1800px] max-w-[120vw]">
            <Image
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              width={1800}
              height={1800}
              className="h-auto w-full object-contain"
              priority={false}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <header className="sticky top-0 z-50 border-b border-white/20 bg-white/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/">
              <Image src="/TradeHub -Horizontal-Main.svg" alt="TradeHub" width={140} height={32} className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:inline-flex">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto max-w-6xl px-4 py-8 md:py-12">
          <section className="max-w-4xl mx-auto mb-8 md:mb-12">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-8 md:mb-10">
                <Image
                  src="/tradehub-horizontal-white-tagline.svg"
                  alt="TradeHub"
                  width={520}
                  height={140}
                  priority
                  className="w-[260px] md:w-[420px] lg:w-[520px] h-auto"
                />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl mb-3 md:mb-4">
                Built by Tradies for Tradies
              </h1>
              <p className="text-base md:text-xl text-white/80 mb-6">
                Quote real projects that match your trade, location, and availability — without paying for leads.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs md:text-sm text-white/90">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-white flex-shrink-0" />
                  <span>No lead selling</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-white flex-shrink-0" />
                  <span>Quote when you want</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-white flex-shrink-0" />
                  <span>Trade & radius matched</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-white flex-shrink-0" />
                  <span>Mobile-first alerts</span>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto py-6 md:py-12">
            <div className="mt-8 md:mt-10 grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
              {FEATURE_CARDS.map((c) => {
                const cardKey =
                  c.title ??
                  (c as Record<string, unknown>).heading ??
                  (c as Record<string, unknown>).name ??
                  '';
                const cardItems =
                  c.items ??
                  (c as Record<string, unknown>).bullets ??
                  (c as Record<string, unknown>).points ??
                  [];
                return (
                  <div
                    key={c.title}
                    className={`group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-md border border-white/20 shadow-xl shadow-blue-900/20 transition-all duration-300 ${c.colSpan2 ? 'md:col-span-2' : ''}`}
                  >
                    {/* left accent edge */}
                    <div
                      className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${c.accent} opacity-80`}
                    />

                    {/* HEADER (always visible) */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCard(openCard === cardKey ? null : (cardKey as string))
                      }
                      className="w-full text-left"
                    >
                      <div className="relative flex items-center gap-4 p-5 sm:p-6 md:p-7">
                        {/* icon */}
                        <div className="relative shrink-0">
                          <div
                            className={`absolute -inset-3 rounded-2xl bg-gradient-to-br ${c.accent} opacity-20 blur-xl`}
                          />
                          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm border border-white/30 shadow-inner shadow-white/40">
                            {c.icon}
                          </div>
                        </div>

                        {/* title */}
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-slate-900">
                            {cardKey}
                          </h3>
                        </div>

                        {/* chevron (mobile only) */}
                        <div className="md:hidden text-slate-700">
                          <ChevronDown
                            className={`h-5 w-5 transition-transform duration-200 ${openCard === cardKey ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* BODY - Mobile: collapsible dropdown | Desktop: always open */}
                    <div
                      className={`px-5 pb-5 sm:px-6 sm:pb-6 md:px-7 md:pb-7 ${openCard === cardKey ? 'block' : 'hidden'} md:block`}
                    >
                      <ul className="space-y-2 text-sm md:text-[15px] text-slate-700">
                        {cardItems.map((item: string) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-[6px] inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500/70" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="py-6 md:py-12">
            <div className="relative mx-auto mt-10 md:mt-20 max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md px-8 py-10 text-center shadow-2xl shadow-blue-900/30">
              {/* subtle glow */}
              <div className="absolute -inset-20 -z-10 opacity-40 blur-3xl bg-gradient-to-r from-blue-400/30 to-indigo-500/30 rounded-full" />

              <p className="text-lg md:text-xl font-medium text-white leading-relaxed">
                Unlike lead platforms, you're never charged per enquiry.
              </p>

              <p className="mt-3 text-base md:text-lg text-blue-100">
                You choose which projects to quote — no bidding wars, no lead fees.
              </p>
            </div>
          </section>

          <section className="py-6 md:py-12">
            <div className="max-w-xl mx-auto mt-6 md:mt-12 px-4 text-center">
              {!MVP_FREE_MODE && (
                <Link
                  href="/pricing"
                  className="text-sm text-white/90 hover:text-white font-medium inline-block mb-4"
                >
                  View Pricing →
                </Link>
              )}

              <div className="space-y-3">
                <Link href="/tenders" className="block">
                  <Button
                    size="lg"
                    className="w-full text-base px-8 py-6 bg-white text-blue-600 hover:bg-white/90"
                  >
                    View Available Work
                  </Button>
                </Link>
                <Link href="/signup" className="block">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full text-base px-8 py-6 border-white text-blue-600 hover:bg-white/10 hover:text-blue-700"
                  >
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-auto border-t border-white/20 bg-white/95 backdrop-blur py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/TradeHub-Mark-blackout.svg"
                  alt="TradeHub"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="text-gray-600 text-sm">
                  © 2024 TradeHub. Australian construction marketplace.
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                <Link href="/tenders" className="text-gray-600 hover:text-gray-900 text-sm">
                  Tenders
                </Link>
                {!MVP_FREE_MODE && (
                  <Link href="/pricing" className="text-gray-600 hover:text-gray-900 text-sm">
                    Pricing
                  </Link>
                )}
                <Link href="/jobs" className="text-gray-600 hover:text-gray-900 text-sm">
                  Jobs
                </Link>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900 text-sm">
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
