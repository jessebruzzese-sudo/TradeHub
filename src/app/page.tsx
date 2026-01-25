'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MarketingHeader } from '@/components/marketing-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterPush } from '@/lib/safe-nav';

import {
  CircleCheck as CheckCircle2,
  Briefcase,
  CalendarCheck,
  BadgeCheck,
  UserCheck,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

type MobileSection = 'how' | 'trust' | 'tendering' | null;

export default function HomePage() {
  const { session, currentUser } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  // ✅ Single open section (prevents stacked layout shifts)
  const [openMobileSection, setOpenMobileSection] = useState<MobileSection>(null);

  // ✅ Refs used for centering after open
  const howRef = useRef<HTMLDivElement | null>(null);
  const trustRef = useRef<HTMLDivElement | null>(null);
  const tenderingRef = useRef<HTMLDivElement | null>(null);

  const isAuthed = !!session?.user;

  useEffect(() => {
    setIsVisible(true);

    // Hard reset any accidental scroll locking
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }, []);

  // ✅ After open state updates + paint, center the whole dropdown block
  useEffect(() => {
    if (!openMobileSection) return;

    const target =
      openMobileSection === 'how'
        ? howRef.current
        : openMobileSection === 'trust'
        ? trustRef.current
        : tenderingRef.current;

    if (!target) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();

        const headerOffset = 80; // sticky header height
        const viewportCenter = window.innerHeight / 2;

        // Center the entire block (header + panel)
        const targetY =
          window.scrollY + rect.top - headerOffset - (viewportCenter - rect.height / 2);

        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      });
    });
  }, [openMobileSection]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = 80;
    const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const goDashboard = () => {
    const role = (currentUser as any)?.role;
    router.push(role === 'admin' ? '/admin' : '/dashboard');
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

  const stepBadgeClass = (n: number) => {
    if (n === 1) return 'bg-blue-600';
    if (n === 2) return 'bg-gray-900';
    if (n === 3) return 'bg-emerald-600';
    return 'bg-indigo-600';
  };

  const MobileDropdown = ({
    title,
    icon,
    isOpen,
    onToggle,
    children,
    sectionId,
    wrapRef,
  }: {
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    sectionId: string;
    wrapRef: React.RefObject<HTMLDivElement>;
  }) => {
    return (
      <section id={sectionId} className="scroll-mt-24 md:hidden">
        <div className="mx-auto max-w-7xl px-4">
          <div ref={wrapRef} className="relative w-full">
            <button
              type="button"
              onClick={onToggle}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-gray-100 px-4 py-4 text-left shadow-sm"
            >
              <span className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                  {icon}
                </span>
                <span className="text-base font-semibold text-gray-900">{title}</span>
              </span>

              <ChevronDown
                className={`h-5 w-5 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Render only when open to keep spacing tight */}
            {isOpen ? (
              <div className="mt-3 origin-top rounded-2xl border border-gray-300 bg-white shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="p-4">{children}</div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  };

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

        {/* MOBILE dropdowns */}
        <div className="space-y-4 py-2 md:hidden">
          <MobileDropdown
            title="How TradeHub works"
            icon={<Briefcase className="h-5 w-5 text-slate-700" />}
            isOpen={openMobileSection === 'how'}
            onToggle={() => setOpenMobileSection(openMobileSection === 'how' ? null : 'how')}
            sectionId="how-tradehub-works"
            wrapRef={howRef}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-200 p-2">
                  <Briefcase className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Be your own agency</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Post job listings or project tenders, reach verified local trades, and fill gaps quickly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-100 p-2">
                  <CalendarCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Fill your schedule</p>
                  <p className="mt-1 text-sm text-gray-700">
                    List availability or respond to relevant work nearby — no chasing leads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-100 p-2">
                  <BadgeCheck className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Build a profile that works for you</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Show trade, experience, and reliability so the right people contact you.
                  </p>
                </div>
              </div>
            </div>
          </MobileDropdown>

          <MobileDropdown
            title="Trust & Safety"
            icon={<ShieldCheck className="h-5 w-5 text-blue-700" />}
            isOpen={openMobileSection === 'trust'}
            onToggle={() => setOpenMobileSection(openMobileSection === 'trust' ? null : 'trust')}
            sectionId="trust"
            wrapRef={trustRef}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-200 p-2">
                  <UserCheck className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Profiles & reputation</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Work history, reviews, and reliability signals build trust over time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-100 p-2">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Verification signals</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Clear status indicators for checks (like ABN/verification) where applicable.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-100 p-2">
                  <MessageSquare className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">On-platform messaging</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Keep conversations organised with job-based threads and history.
                  </p>
                </div>
              </div>
            </div>
          </MobileDropdown>

          <MobileDropdown
            title="How tendering works"
            icon={<CalendarCheck className="h-5 w-5 text-emerald-700" />}
            isOpen={openMobileSection === 'tendering'}
            onToggle={() => setOpenMobileSection(openMobileSection === 'tendering' ? null : 'tendering')}
            sectionId="how-tendering-works"
            wrapRef={tenderingRef}
          >
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Tendering on TradeHub means Project Tenders.</span> It&apos;s not a
              job listing — it&apos;s for projects where you want pricing from multiple trade businesses. You pick the trades
              you need, and relevant companies submit quotes.
            </p>

            <div className="mt-4 grid gap-3">
              {[
                { n: 1, t: 'Post the project', d: 'Upload plans/scopes so trades can price accurately.' },
                { n: 2, t: 'Select trades + radius', d: 'Only relevant businesses see it.' },
                { n: 3, t: 'Receive multiple quotes', d: 'Compare options and clarify inclusions.' },
                { n: 4, t: 'Award the work', d: 'Choose who you want to do the job.' },
              ].map((s) => (
                <div key={s.n} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${stepBadgeClass(
                        s.n
                      )}`}
                    >
                      {s.n}
                    </span>
                    <p className="text-sm font-semibold text-gray-900">{s.t}</p>
                    </div>
                  <p className="mt-1 text-sm text-gray-700">{s.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Button className="w-full" onClick={handleCreateTender}>
                Post a Project Tender
              </Button>
              <Link href={tendersHref} className="w-full">
                <Button variant="outline" className="w-full">
                  View Project Tenders
                </Button>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => scrollToSection('tenders')}
              className="mt-4 w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Back to top
            </button>
          </MobileDropdown>
        </div>

        {/* DESKTOP sections */}
        <section id="how-tradehub-works" className="hidden scroll-mt-24 bg-gray-50 py-12 md:block md:py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">How TradeHub works</h2>
              <p className="text-sm text-gray-600 md:text-base">
                Built to help businesses stay busy, flexible, and in control — without lead fees.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-slate-200 p-2">
                    <Briefcase className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Be your own agency</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      TradeHub lets you operate like your own labour agency. Post job listings or project tenders when work appears,
                      reach verified local trades, and fill gaps quickly — without recruiters or phone trees.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      {[
                        'Post short-term or ongoing work',
                        'Reach trades by trade + distance',
                        'Compare availability and responses in one place',
                        'Hire directly — no commissions or lead fees',
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-600" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-emerald-100 p-2">
                    <CalendarCheck className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Fill the gaps in your schedule</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Trades can list availability ahead of time or respond to relevant work nearby. Instead of chasing leads,
                      you get contacted for real jobs that fit your trade, location, and timing.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      {[
                        'List available days or weeks',
                        'Get contacted for relevant work',
                        'Quote real projects — not bought leads',
                        'Stay flexible without over-committing',
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-indigo-100 p-2">
                    <BadgeCheck className="h-5 w-5 text-indigo-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Build a profile that works for you</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Your TradeHub profile becomes a professional snapshot of your business — trade, experience, location, and reliability —
                      helping the right people trust and contact you.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      {[
                        'Trade, location, and business details',
                        'Work history and portfolio',
                        'Reliability and communication reviews',
                        'Clear signals that build trust over time',
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-700" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="hidden scroll-mt-24 bg-white py-12 md:block md:py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Trust & Safety</h2>
              <p className="text-sm text-gray-600 md:text-base">
                Built for real trade businesses — verification signals, reputation, and clear accountability.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-gray-300 bg-gray-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-slate-200 p-2">
                    <UserCheck className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Profiles & reputation</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Work history, reviews, and reliability signals build trust over time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 bg-gray-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-blue-100 p-2">
                    <ShieldCheck className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Verification signals</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Clear status pills for checks (like ABN/verification) where applicable.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 bg-gray-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-emerald-100 p-2">
                    <MessageSquare className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">On-platform messaging</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Keep conversations organised with job-based threads and history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-tendering-works" className="hidden scroll-mt-24 bg-gray-50 py-12 md:block md:py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">How tendering works</h2>
              <p className="mx-auto max-w-3xl text-sm text-gray-600 md:text-base">
                <span className="font-semibold text-gray-900">Tendering on TradeHub means Project Tenders.</span> It&apos;s not a
                job listing — it&apos;s for projects where you want pricing from multiple trade businesses. You pick the trades
                you need, and relevant companies can submit quotes to bid on the work.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              {[
                { n: 1, t: 'Post the project', d: 'Upload plans/scopes and add key details so trades can price accurately.' },
                { n: 2, t: 'Select trades + radius', d: 'Choose required trades and set the radius so only relevant businesses see it.' },
                { n: 3, t: 'Receive multiple quotes', d: 'Multiple companies submit quotes to bid. Message to clarify inclusions.' },
                { n: 4, t: 'Award the work', d: 'Compare price, timing, and reputation — then award the project to who you choose.' },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${stepBadgeClass(
                        s.n
                      )}`}
                    >
                      {s.n}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{s.t}</h3>
                  </div>
                  <p className="text-sm text-gray-700">{s.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={handleCreateTender}>
                Post a Project Tender
              </Button>
              <Link href={tendersHref} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  View Project Tenders
                </Button>
              </Link>

              <button
                type="button"
                onClick={() => scrollToSection('tenders')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Back to top
              </button>
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
