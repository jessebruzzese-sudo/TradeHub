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
          className="scroll-mt-24 mx-auto max-w-7xl bg-gradient-to-b from-gray-50 to-white px-4 py-8 md:bg-none md:py-16"
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
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200">
                  <Briefcase className="h-5 w-5 text-slate-700" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-gray-900">How TradeHub works</h2>
                <p className="mb-4 flex-1 text-sm text-gray-600">
                  Built to help businesses stay busy, flexible, and in control — without lead fees.
                </p>
                <Link href="/how-it-works">
                  <Button variant="outline" className="w-full">
                    Learn more
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-gray-900">Trust & Safety</h2>
                <p className="mb-4 flex-1 text-sm text-gray-600">
                  Verification signals, reputation tracking, and clear accountability for real trade businesses.
                </p>
                <Link href="/trust-safety">
                  <Button variant="outline" className="w-full">
                    Learn more
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <CalendarCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-gray-900">How tendering works</h2>
                <p className="mb-4 flex-1 text-sm text-gray-600">
                  Post project tenders, receive multiple quotes from relevant trades, and award work to who you choose.
                </p>
                <Link href="/tendering">
                  <Button variant="outline" className="w-full">
                    Learn more
                  </Button>
                </Link>
              </div>
            </div>
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
