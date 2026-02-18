'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { MarketingHeader } from '@/components/marketing-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterPush } from '@/lib/safe-nav';

import {
  CircleCheck as CheckCircle2,
  Briefcase,
  CalendarCheck,
  ShieldCheck,
  Droplets,
  Zap,
  Hammer,
  Grid3X3,
  Paintbrush,
  Layers,
  Home,
  Leaf,
} from 'lucide-react';

export default function HomePage() {
  const { session, currentUser } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  const isAuthed = !!session?.user;

  useEffect(() => {
    setIsVisible(true);

    // Hard reset any accidental scroll locking
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }, []);

  const goDashboard = () => {
    router.push(isAdmin(currentUser) ? '/admin' : '/dashboard');
  };

  const handleCreateTender = () => {
    if (!isAuthed) {
      safeRouterPush(router, buildLoginUrl('/tenders/create'), '/login');
      return;
    }
    safeRouterPush(router, '/tenders/create', '/tenders/create');
  };

  const jobsHref = useMemo(() => (isAuthed ? '/jobs' : buildLoginUrl('/jobs')), [isAuthed]);
  const tendersHref = useMemo(() => (isAuthed ? '/tenders' : buildLoginUrl('/tenders')), [isAuthed]);

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <main>
        {/* HERO */}
        <section
          id="tenders"
          className="scroll-mt-24 mx-auto max-w-7xl bg-gradient-to-b from-gray-50 to-white px-4 py-6 md:bg-none md:py-14"
        >
          <div className="mx-auto max-w-[56rem]">
            <div className="text-center">
              {/* ✅ Hero logo (desktop + mobile) */}
              <div
                className={`mb-6 flex justify-center transition-all duration-500 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              >
                <Image
                  src="/TradeHub-Horizontal-Main.svg"
                  alt="TradeHub"
                  width={600}
                  height={140}
                  priority
                  className="h-auto w-[300px] sm:w-[380px] md:w-[460px]"
                />
              </div>

              <h1
                className={`mb-3 text-3xl font-extrabold leading-tight text-gray-900 transition-all duration-500 md:mb-4 md:text-5xl md:font-bold md:leading-normal lg:text-6x1${
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0 md:translate-y-0 md:opacity-100'
                }`}
              > 
                Find the right trades, when they’re available. 
              </h1>

              <p className="mb-8 text-base leading-relaxed text-gray-600 md:mb-8 md:text-xl">
                TradeHub helps you hire subcontractors and find real work: post project tenders, receive quotes, and browse
                job listings — not bought leads.
              </p>

              {/* Desktop CTA grid */}
              <div className="mb-6 hidden grid-cols-1 gap-3 sm:grid-cols-2 md:grid">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 px-8 py-6 text-base hover:bg-blue-700"
                  onClick={handleCreateTender}
                >
                  Post a Project Tender
                </Button>

                <Link href="/tenders" className="block">
                  <Button size="lg" variant="outline" className="w-full px-8 py-6 text-base">
                    View Project Tenders
                  </Button>
                </Link>

                <Link href={jobsHref} className="block">
                  <Button
                    size="lg"
                    className="w-full bg-yellow-500 px-8 py-6 text-base text-gray-900 hover:bg-yellow-600"
                  >
                    Browse Job Listings
                  </Button>
                </Link>

                <Link href="/jobs/create" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-green-600 px-8 py-6 text-base text-white hover:bg-green-700"
                  >
                    Post a Job Listing
                  </Button>
                </Link>
              </div>

              {/* Mobile simplified hero */}
              <div className="block md:hidden">
                <div
                  className={`transition-all duration-500 delay-150 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                >
                  {isAuthed ? (
                    <Button
                      size="lg"
                      className="w-full rounded-2xl bg-blue-600 px-6 py-6 text-base font-semibold shadow-lg hover:bg-blue-700"
                      onClick={goDashboard}
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <Link href="/signup" className="block">
                      <Button
                        size="lg"
                        className="w-full rounded-2xl bg-blue-600 px-6 py-6 text-base font-semibold shadow-lg hover:bg-blue-700"
                      >
                        Get Started
                      </Button>
                    </Link>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Link href="/tenders" className="block">
                      <Button variant="outline" className="w-full py-5 text-sm font-semibold">
                        Project Tenders
                      </Button>
                    </Link>

                    <Link href={jobsHref} className="block">
                      <Button variant="outline" className="w-full py-5 text-sm font-semibold">
                        Job Listings
                      </Button>
                    </Link>
                  </div>

                  {/* Mobile: compact feature chips */}
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-700">
                    {[
                      'No lead selling',
                      'Radius-based matching',
                      'Build a professional profile',
                      'Tailored for your trade',
                    ].map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="whitespace-nowrap">{t}</span>
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-center text-xs text-gray-500">Free to join • No paid leads</p>
                </div>
              </div>

              {/* Desktop trust bullets (with logo positioned to the right of the line) */}
              <div className="mb-0 hidden md:block">
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-700">
                      {[
                        'No lead selling',
                        'Radius-based matching',
                        'Build a professional profile',
                        'Tailored for your trade',
                      ].map((t) => (
                        <div key={t} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-center">
                      <Image
                        src="/TradeHub  -Mark-Main.svg"
                        alt="TradeHub"
                        width={40}
                        height={40}
                        className="h-10 w-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile doesn't need duplicate bullets here (already shown as chips) */}
            </div>
          </div>
        </section>

        {/* Teaser cards — link to dedicated SEO pages */}
        <section className="bg-gray-50 py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 sm:h-10 sm:w-10">
                  <Briefcase className="h-5 w-5 text-slate-700" />
                </div>
                <h2 className="mb-2 text-base font-bold text-gray-900 sm:text-lg">How TradeHub works</h2>
                <p className="mb-3 flex-1 text-xs text-slate-600 sm:text-sm sm:mb-4">
                  Built to help businesses stay busy, flexible, and in control — without lead fees.
                </p>
                <Link href="/how-it-works">
                  <Button variant="outline" className="h-9 w-full sm:h-10">
                    Learn more
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 sm:h-10 sm:w-10">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
                <h2 className="mb-2 text-base font-bold text-gray-900 sm:text-lg">Trust & Safety</h2>
                <p className="mb-3 flex-1 text-xs text-slate-600 sm:text-sm sm:mb-4">
                  Verification signals, reputation tracking, and clear accountability for real trade businesses.
                </p>
                <Link href="/trust-safety">
                  <Button variant="outline" className="h-9 w-full sm:h-10">
                    Learn more
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 sm:h-10 sm:w-10">
                  <CalendarCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <h2 className="mb-2 text-base font-bold text-gray-900 sm:text-lg">How tendering works</h2>
                <p className="mb-3 flex-1 text-xs text-slate-600 sm:text-sm sm:mb-4">
                  Post project tenders, receive multiple quotes from relevant trades, and award work to who you choose.
                </p>
                <Link href="/tendering">
                  <Button variant="outline" className="h-9 w-full sm:h-10">
                    Learn more
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Built for Australian Trade Businesses */}
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">
              Built for Australian Trade Businesses
            </h2>

            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              TradeHub helps Plumbing, Electrical, Carpentry and construction businesses operate like their own agency — find more work, fill schedule gaps, and connect with verified local businesses without paying lead fees.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { label: 'Plumbing', icon: Droplets },
                { label: 'Electrical', icon: Zap },
                { label: 'Carpentry', icon: Hammer },
                { label: 'Tiling', icon: Grid3X3 },
                { label: 'Painting', icon: Paintbrush },
                { label: 'Plastering', icon: Layers },
                { label: 'Roofing', icon: Home },
                { label: 'Landscaping', icon: Leaf },
              ].map((trade) => {
                const Icon = trade.icon;
                return (
                  <span
                    key={trade.label}
                    className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {trade.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/signup">Create free account</Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How TradeHub Works in 30 Seconds */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              How TradeHub Works in 30 Seconds
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Operate like your own agency. Find more work. Stay flexible.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: '1. Create your business profile',
                desc: 'Add your trade, service area, and availability. Build trust with clear verification signals.',
              },
              {
                title: '2. Find work or post projects',
                desc: 'Browse jobs, receive direct enquiries, or post tenders to get multiple quotes.',
              },
              {
                title: '3. Connect and get started',
                desc: 'Message directly, compare options, and hire with clarity — no lead selling.',
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/TradeHub  -Mark-Main.svg" alt="TradeHub" width={32} height={32} className="h-8 w-8" />
              <span className="text-sm text-gray-600">© 2024 TradeHub. Australian construction marketplace.</span>
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
