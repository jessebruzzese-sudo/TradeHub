'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { Button } from '@/components/ui/button';

// ✅ MUST be default import (per your TS error)
import StatusPill from '@/components/status-pill';

import { useAuth } from '@/lib/auth';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterReplace, safeRouterPush } from '@/lib/safe-nav';

import {
  FileText,
  Briefcase,
  ClipboardList,
  MessageSquare,
  LogOut,
  ShieldCheck,
  ArrowRight,
  User as UserIcon,
  Calendar,
} from 'lucide-react';

type TrustStatus = 'pending' | 'approved' | 'verified';

function normalizeTrustStatus(input: unknown): TrustStatus {
  const v = String(input ?? 'pending').toLowerCase().trim();

  if (v === 'pending' || v === 'approved' || v === 'verified') return v;

  // common variants you might have in db
  if (v === 'unverified') return 'pending';
  if (v === 'accepted') return 'approved';
  if (v === 'approved_business') return 'approved';
  if (v === 'verified_business') return 'verified';

  return 'pending';
}

function normalizePlan(input: unknown): { isPro: boolean; label: 'Pro' | 'Free' } {
  const v = String(input ?? 'free').toLowerCase().trim();
  const isPro = ['pro', 'premium', 'paid'].includes(v);
  return { isPro, label: isPro ? 'Pro' : 'Free' };
}

export default function DashboardPage() {
  const { session, currentUser, isLoading, logout } = useAuth();
  const router = useRouter();

  const hasSession = !!session?.user;
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasSession) {
      safeRouterReplace(router, buildLoginUrl('/dashboard'), '/login');
    }
  }, [isLoading, hasSession, router]);

  const displayName = useMemo(() => {
    return (
      (currentUser as any)?.name ||
      (session?.user?.user_metadata as any)?.name ||
      session?.user?.email ||
      'there'
    );
  }, [currentUser, session]);

  const trustStatus: TrustStatus = useMemo(() => {
    const raw =
      (currentUser as any)?.trustStatus ??
      (currentUser as any)?.trust_status ??
      (currentUser as any)?.abnStatus ??
      (currentUser as any)?.abn_status ??
      'pending';

    return normalizeTrustStatus(raw);
  }, [currentUser]);

  const trustLabel =
    trustStatus === 'verified'
      ? 'Verified'
      : trustStatus === 'approved'
      ? 'Approved'
      : 'Verification in progress';

  const isVerified = trustStatus === 'verified';

  const planRaw =
    (currentUser as any)?.plan ??
    (currentUser as any)?.subscriptionPlan ??
    (currentUser as any)?.subcontractorPlan ??
    (currentUser as any)?.subcontractor_plan ??
    'free';

  const { isPro, label: planLabel } = useMemo(() => normalizePlan(planRaw), [planRaw]);

  if (isLoading) {
    return (
      <TradeGate>
        <AppLayout>
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
            Loading...
          </div>
        </AppLayout>
      </TradeGate>
    );
  }

  if (!hasSession) {
    return (
      <TradeGate>
        <AppLayout>
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
            Redirecting…
          </div>
        </AppLayout>
      </TradeGate>
    );
  }

  return (
    <TradeGate>
      <AppLayout>
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="mt-1 flex flex-wrap items-center gap-2 text-base text-gray-700 sm:text-lg">
                <span className="min-w-0">
                  Welcome, <span className="font-semibold text-gray-900">{displayName}</span>
                </span>

                <StatusPill type="trust" status={trustStatus} label={trustLabel} />

                <span
                  className={`inline-flex items-center rounded-full border px-2 py-[3px] text-xs font-medium ${
                    isPro
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                >
                  {planLabel}
                </span>

                {!isPro && (
                  <Link href="/pricing" className="inline-flex">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      Upgrade to Pro
                    </Button>
                  </Link>
                )}
              </p>

              {/* Mobile-only: direct Profile button */}
              <div className="mt-3 sm:hidden">
                <Link href="/profile" className="block">
                  <Button variant="outline" className="w-full justify-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Go to Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Desktop-only: Availability shortcut */}
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/availability" className="inline-flex">
                <Button variant="outline" className="h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  List availability
                </Button>
              </Link>
            </div>
          </div>

          {!currentUser && (
            <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              We’re still loading your profile details. You can continue using the platform — if
              this doesn’t resolve, refresh the page.
            </div>
          )}

          {!isVerified && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Build trust faster</div>
                  <div className="text-sm text-gray-600">
                    Verify your business to improve credibility and unlock stronger visibility
                    signals.
                  </div>
                </div>
              </div>

              <Button
                onClick={() => safeRouterPush(router, '/verify-business', '/verify-business')}
                className="w-full sm:w-auto"
              >
                Verify business <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Primary actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Project Tendering</h2>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Upload plans, request quotes, and compare responses privately.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                  onClick={() => safeRouterPush(router, '/tenders/create', '/tenders/create')}
                >
                  Post a Tender
                </Button>

                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => safeRouterPush(router, '/tenders', '/tenders')}
                >
                  Browse Tenders
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Post standard jobs, review applications, and hire confidently.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  onClick={() => safeRouterPush(router, '/jobs/create', '/jobs/create')}
                >
                  Post a Job
                </Button>

                <Button
  variant="outline"
  className="w-full sm:w-auto border-green-200 text-green-700 hover:bg-green-50"
  onClick={() => safeRouterPush(router, '/jobs', '/jobs')}
>
  Job Listings
</Button>

              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/messages"
              className="rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 active:scale-[0.99] sm:p-5"
            >
              <div className="mb-1 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-700" />
                <div className="font-semibold text-gray-900">Messages</div>
              </div>
              <div className="text-sm text-gray-600">Continue conversations and respond faster.</div>
            </Link>

            <Link
              href="/applications"
              className="rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 active:scale-[0.99] sm:p-5"
            >
              <div className="mb-1 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-gray-700" />
                <div className="font-semibold text-gray-900">Applications</div>
              </div>
              <div className="text-sm text-gray-600">
                Track jobs you’ve applied for and responses.
              </div>
            </Link>
          </div>

          {/* Logout */}
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={loggingOut}
              onClick={async () => {
                if (loggingOut) return;
                setLoggingOut(true);
                try {
                  await logout();
                  if (typeof window !== 'undefined') window.location.assign('/');
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </Button>
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
