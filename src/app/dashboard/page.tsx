'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';

import {
  Calendar,
  Briefcase,
  FileText,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Search,
  Users,
  ArrowRight,
} from 'lucide-react';

function norm(v?: string | null) {
  return String(v || '').trim().toLowerCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, currentUser, isLoading, refreshUser } = useAuth();

  const hasSession = !!session?.user;

  // Hooks before returns (role used for UI/copy only, not permissions)
  const role = useMemo(() => norm(currentUser?.role), [currentUser?.role]);
  const isAdminUser = isAdmin(currentUser);
  const isContractor = role === 'contractor';
  const isSubcontractor = role === 'subcontractor';

  const abnStatus = useMemo(
    () => norm((currentUser as any)?.abnStatus ?? (currentUser as any)?.abn_status ?? ''),
    [currentUser]
  );
  const isAbnVerified = abnStatus === 'verified';

  const trustStatus = useMemo(
    () => norm((currentUser as any)?.trustStatus ?? (currentUser as any)?.trust_status ?? 'pending'),
    [currentUser]
  );

  const greetingName = useMemo(() => {
    const base = currentUser?.name || currentUser?.email || 'there';
    return String(base).split(' ')[0];
  }, [currentUser?.name, currentUser?.email]);

  const trustPill = useMemo(() => {
    const s = trustStatus || 'pending';
    const label = s.replace(/_/g, ' ');
    const cls =
      s === 'verified'
        ? 'bg-green-100 text-green-700'
        : s === 'pending'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-gray-100 text-gray-700';

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  }, [trustStatus]);

  useEffect(() => {
    if (isLoading) return;

    if (!hasSession) {
      const returnUrl = getSafeReturnUrl('/dashboard', '/dashboard');
      safeRouterReplace(router, `/login?returnUrl=${encodeURIComponent(returnUrl)}`, '/login');
    }
  }, [isLoading, hasSession, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Loading dashboard…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Redirecting to login…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
          <PageHeader title="Dashboard" description="We couldn't load your profile yet." />
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Profile not ready</p>
            <p className="mt-1 text-sm text-amber-800">
              Try again — this can happen briefly while your profile row is being created.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    await refreshUser();
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Retry
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ✅ Fix: never route to /jobs/new (collides with /jobs/[id] and causes uuid errors)
  // Use /jobs/create (matches your /tenders/create convention)
  const postJobHref = !isAdminUser && !isAbnVerified
    ? `/verify-business?returnUrl=${encodeURIComponent('/jobs/create')}`
    : '/jobs/create';

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
        {/* Header row (compact, no redundant back link) */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <PageHeader title="Dashboard" description={`Welcome back, ${greetingName}.`} />

            {/* Status pills tucked under header */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Account:</span>
              {trustPill}

              {!isAdminUser && (
                <>
                  <span className="mx-1 text-gray-300">•</span>
                  <span className="text-sm text-gray-600">ABN:</span>
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      isAbnVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                    ].join(' ')}
                  >
                    {isAbnVerified ? 'verified' : 'unverified'}
                  </span>

                  {!isAbnVerified && (
                    <Link href={`/verify-business?returnUrl=${encodeURIComponent('/dashboard')}`} className="ml-2">
                      <Button size="sm" className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Verify ABN
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profile/availability">
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                List availability
              </Button>
            </Link>
          </div>
        </div>

        {/* ABN callout */}
        {!isAdminUser && !isAbnVerified && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  Verify your ABN to unlock posting jobs and applying for tenders.
                </p>
                <p className="mt-1 text-sm text-red-800">
                  Browsing and messaging still works — verification is required for trust-critical actions.
                </p>
                <div className="mt-3">
                  <Link href={`/verify-business?returnUrl=${encodeURIComponent('/dashboard')}`}>
                    <Button size="sm" className="gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Verify now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main actions */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isContractor && (
            <>
              <ActionCard
                title="Post a Job"
                description="Create a job and reach relevant subcontractors."
                href={postJobHref}
                icon={<Briefcase className="h-5 w-5" />}
                badge={!isAbnVerified ? <Badge variant="secondary">ABN required</Badge> : undefined}
              />
              <ActionCard
                title="Browse Subcontractors"
                description="Find available trades near you."
                href="/subcontractors"
                icon={<Users className="h-5 w-5" />}
              />
              <ActionCard
                title="Tenders"
                description="Create and manage tenders."
                href="/tenders"
                icon={<FileText className="h-5 w-5" />}
                badge={!isAbnVerified ? <Badge variant="secondary">ABN required</Badge> : undefined}
              />
              <ActionCard
                title="Messages"
                description="Chat with subcontractors and manage threads."
                href="/messages"
                icon={<MessageSquare className="h-5 w-5" />}
              />
              <ActionCard
                title="Applications"
                description="Review incoming applications."
                href="/applications"
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <ActionCard
                title="Search"
                description="Search jobs, tenders, and people."
                href="/search"
                icon={<Search className="h-5 w-5" />}
              />
            </>
          )}

          {isSubcontractor && (
            <>
              <ActionCard
                title="Find Jobs"
                description="Browse jobs that match your trade and radius."
                href="/jobs"
                icon={<Search className="h-5 w-5" />}
              />
              <ActionCard
                title="My Applications"
                description="Track applications and statuses."
                href="/applications"
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <ActionCard
                title="Tenders"
                description="View and respond to tenders."
                href="/tenders"
                icon={<FileText className="h-5 w-5" />}
                badge={!isAbnVerified ? <Badge variant="secondary">ABN required</Badge> : undefined}
              />
              <ActionCard
                title="Messages"
                description="Chat with contractors and manage threads."
                href="/messages"
                icon={<MessageSquare className="h-5 w-5" />}
              />
              <ActionCard
                title="Availability"
                description="Update your available days."
                href="/profile/availability"
                icon={<Calendar className="h-5 w-5" />}
              />
              <ActionCard
                title="Profile"
                description="Update your business profile."
                href="/profile"
                icon={<Users className="h-5 w-5" />}
              />
            </>
          )}

          {isAdminUser && (
            <>
              <ActionCard
                title="Admin"
                description="Manage users, reviews and platform settings."
                href="/admin"
                icon={<ShieldCheck className="h-5 w-5" />}
              />
              <ActionCard
                title="Users"
                description="Search and manage accounts."
                href="/admin/users"
                icon={<Users className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-700 group-hover:bg-gray-100">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              {badge}
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        </div>

        <ArrowRight className="mt-1 h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
      </div>
    </Link>
  );
}
