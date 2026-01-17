'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { MarketingHeader } from '@/components/marketing-header';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/status-pill';
import { useAuth } from '@/lib/auth-context';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterPush } from '@/lib/safe-nav';

import {
  CircleCheck as CheckCircle2,
  Shield,
  FileText,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Clock,
  Upload,
  Users,
  Target,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const { session, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  // Source of truth for "logged in"
  const isAuthed = !!session?.user;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const goDashboard = () => {
    // If role is known and admin -> /admin, otherwise /dashboard
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

  // Use session for gating links (not currentUser)
  const jobsHref = useMemo(() => (isAuthed ? '/jobs' : buildLoginUrl('/jobs')), [isAuthed]);
  const tendersHref = useMemo(() => (isAuthed ? '/tenders' : buildLoginUrl('/tenders')), [isAuthed]);

  return (
    <div className="min-h-screen bg-white">
      {/* ✅ Use the session-aware header */}
      <MarketingHeader />

      <main>
        <section className="mx-auto max-w-7xl bg-gradient-to-b from-gray-50 to-white px-4 py-8 md:bg-none md:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center md:text-left">
              <h1
                className={`mb-3 text-3xl font-extrabold leading-tight text-gray-900 transition-all duration-500 md:mb-4 md:text-5xl md:font-bold md:leading-normal lg:text-6xl ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 md:translate-y-0 md:opacity-100'
                }`}
              >
                Price projects{' '}
                <span className="uppercase text-blue-600 md:normal-case md:text-gray-900">without</span> chasing trades
              </h1>

              <p className="mb-8 text-base leading-relaxed text-gray-600 md:mb-8 md:text-xl">
                TradeHub helps you hire subcontractors and find real work: post tenders, receive quotes, and browse jobs — not
                bought leads.
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
                    View Available Tenders
                  </Button>
                </Link>

                <Link href={jobsHref} className="block">
                  <Button
                    size="lg"
                    className="w-full bg-yellow-500 px-8 py-6 text-base text-gray-900 hover:bg-yellow-600"
                  >
                    Find Jobs
                  </Button>
                </Link>

                <Link href="/jobs/create" className="block">
                  <Button size="lg" className="w-full bg-green-600 px-8 py-6 text-base text-white hover:bg-green-700">
                    Post a Job
                  </Button>
                </Link>
              </div>

              {/* Mobile simplified CTA */}
              <div className="mb-12 block md:hidden">
                <div
                  className={`transition-all duration-500 delay-150 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 md:translate-y-0 md:opacity-100'
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
                    <Link href="/signup">
                      <Button
                        size="lg"
                        className="w-full rounded-2xl bg-blue-600 px-6 py-6 text-base font-semibold shadow-lg hover:bg-blue-700"
                      >
                        Get Started
                      </Button>
                    </Link>
                  )}
                  <p className="mt-3 text-center text-xs text-gray-500">Free to join • No paid leads</p>
                </div>
              </div>

              {/* Desktop trust bullets */}
              <div className="mb-0 hidden flex-wrap items-center justify-start gap-x-4 gap-y-2 text-sm text-gray-700 md:flex">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>No lead selling</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Radius-based matching</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Trial tender included</span>
                </div>
              </div>

              {/* Mobile quick links */}
              <div className="flex flex-col items-center gap-5 border-t border-gray-200 pt-6 text-center md:hidden">
                <Link href="/how-it-works" className="text-base font-semibold text-gray-700 hover:text-gray-900">
                  How it works?
                </Link>
                <Link href="/how-tendering-works" className="text-base font-semibold text-gray-700 hover:text-gray-900">
                  How project tendering works?
                </Link>
                <Link href="/faqs" className="text-base font-semibold text-gray-700 hover:text-gray-900">
                  FAQs?
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Desktop only sections */}
        <section
  id="tendering-detail"
  className="hidden bg-gray-50 py-8 md:block md:py-12"
>

          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">How TradeHub Works</h2>
              <p className="text-sm text-gray-600 md:text-base">Choose how you use the platform.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Project Tendering */}
              <div className="relative rounded-xl border-2 border-blue-300 bg-white p-6">
                <div className="absolute -top-3 left-4">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">PRIMARY FEATURE</span>
                </div>

                <h3 className="mt-2 mb-2 text-xl font-bold text-gray-900">Project Tendering</h3>
                <p className="mb-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">For Builders & Developers</span>
                </p>
                <p className="mb-4 text-sm text-gray-700">
                  Upload plans and request quotes from relevant trades — even if you don&apos;t know local contractors.
                </p>

                <ul className="mb-6 space-y-2">
                  {['Upload plans & scopes', 'Select required trades', 'Control radius & quote limits', 'Compare quotes privately'].map(
                    (t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                        <span>{t}</span>
                      </li>
                    )
                  )}
                </ul>

                <Button className="mb-3 w-full" onClick={handleCreateTender}>
                  Post a Project Tender
                </Button>

                <button
                  type="button"
                  onClick={() => scrollToSection('tendering-detail')}
                  className="mx-auto flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  How tendering works <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Contractors */}
              <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
                <h3 className="mb-2 text-xl font-bold text-gray-900">Contractors</h3>
                <p className="mb-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">For Builders & trade companies hiring subcontractors</span>
                </p>
                <p className="mb-4 text-sm text-gray-700">
                  Post jobs, manage applications, and hire subcontractors with confidence.
                </p>

                <ul className="mb-6 space-y-2">
                  {['Post standard jobs', 'Review applications', 'Message before hiring', 'Leave reliability reviews'].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/jobs/create" className="mb-3 block">
                  <Button className="w-full" variant="outline">
                    Post a Job
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection('contractors')}
                  className="mx-auto flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Contractor features <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Subcontractors */}
              <div className="rounded-xl border-2 border-gray-200 bg-white p-6">
                <h3 className="mb-2 text-xl font-bold text-gray-900">Subcontractors</h3>
                <p className="mb-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">For Licensed trades & subcontracting businesses</span>
                </p>
                <p className="mb-4 text-sm text-gray-700">
                  Find real work opportunities and quote projects that match your trade and location.
                </p>

                <ul className="mb-6 space-y-2">
                  {['View tenders & jobs', 'Quote real projects (not leads)', 'Set radius & alerts', 'Build reputation'].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <Link href={tendersHref} className="mb-3 block">
                  <Button className="w-full" variant="outline">
                    View Available Work
                  </Button>
                </Link>

                <Link
                  href="/how-it-works/subcontractors"
                  className="mx-auto flex items-center justify-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  How subcontractor listings work <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ... the rest of your sections remain unchanged ... */}

      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/TradeHub  -Mark-Main.svg" alt="TradeHub" width={32} height={32} className="h-8 w-8" />
              <span className="text-sm text-gray-600">© 2024 TradeHub. Australian construction marketplace.</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link href="/tenders" className="text-sm text-gray-600 hover:text-gray-900">
                Tenders
              </Link>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('trust')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Trust & Safety
              </button>
              <Link href="/jobs" className="text-sm text-gray-600 hover:text-gray-900">
                Jobs
              </Link>
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
