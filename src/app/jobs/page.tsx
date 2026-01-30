'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Plus, ShieldCheck, ArrowRight } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { JobCard } from '@/components/job-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterPush } from '@/lib/safe-nav';

type JobsTab = 'find' | 'posts' | 'applications';

function norm(v?: string | null) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Key fixes:
 * - REMOVE TradeGate wrapper (it was causing blank screens by returning null)
 * - Never return null forever: show Loading / Redirecting / Profile Not Ready states
 * - Keep hooks order stable (hooks run before any early returns)
 * - Add ABN gating to "Post Job" button (gates action, not page visibility)
 */
export default function JobsPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const store = getStore();
  const hasRedirected = useRef(false);

  const [tab, setTab] = useState<JobsTab>('find');

  // Snapshot store arrays (memoize fallbacks so useMemo deps stay stable)
  const jobs = useMemo(() => store.jobs ?? [], [store.jobs]);
  const applications = useMemo(() => store.applications ?? [], [store.applications]);

  // Compute ABN verified state (optional field right now)
  const abnStatus = useMemo(
    () => norm((currentUser as any)?.abnStatus ?? (currentUser as any)?.abn_status ?? ''),
    [currentUser]
  );
  const isAbnVerified = abnStatus === 'verified';

  const myPosts = useMemo(() => {
    if (!currentUser?.id) return [];
    try {
      return store.getJobsByContractor(currentUser.id) || [];
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const myApplications = useMemo(() => {
    if (!currentUser?.id) return [];
    return applications.filter((a: any) => a.subcontractorId === currentUser.id);
  }, [applications, currentUser?.id]);

  const availableJobs = useMemo(() => {
    if (!currentUser?.id) return [];
    return jobs.filter((j: any) => {
      const alreadyApplied = myApplications.some((a: any) => a.jobId === j.id);
      const tradeMatches = j.tradeCategory === currentUser.primaryTrade;
      const isOpen = j.status === 'open';
      const notOwnJob = j.contractorId !== currentUser.id;
      return isOpen && !alreadyApplied && tradeMatches && notOwnJob;
    });
  }, [jobs, myApplications, currentUser?.primaryTrade, currentUser?.id]);

  // Redirect only after auth finishes initializing
  useEffect(() => {
    if (isLoading) return;
    if (hasRedirected.current) return;

    if (!currentUser) {
      hasRedirected.current = true;
      safeRouterPush(router, buildLoginUrl('/jobs'), buildLoginUrl('/jobs'));
    }
  }, [isLoading, currentUser, router]);

  // ---- Renders (no TradeGate; never return null forever) ----

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Loading jobs…
      </div>
    );
  }

  // If user is not authed, redirect effect runs; show a small fallback
  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Redirecting to login…
      </div>
    );
  }

  const isContractor = norm(currentUser.role) === 'contractor';
  const showAbnGateForPosting = isContractor && !isAbnVerified;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
            <p className="text-gray-600">Find subcontracting work or post jobs to hire subcontractors</p>
          </div>

          {/* Post Job CTA (gate the action, not the page) */}
          {showAbnGateForPosting ? (
            <div className="flex items-center gap-2">
              <Link href={`/verify-business?returnUrl=${encodeURIComponent('/jobs')}`}>
                <Button className="min-w-[160px] gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Verify ABN to Post
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/jobs/create">
              <Button variant="primary-green" className="min-w-[160px]">
                <Plus className="mr-2 h-4 w-4" />
                Post Job
              </Button>
            </Link>
          )}
        </div>

        {/* Optional ABN callout for contractors */}
        {showAbnGateForPosting && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Verify your ABN to post jobs.</p>
                <p className="mt-1 text-sm text-red-800">
                  Browsing jobs still works — verification is required for trust-critical actions like posting.
                </p>
                <div className="mt-3">
                  <Link href={`/verify-business?returnUrl=${encodeURIComponent('/jobs')}`}>
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as JobsTab)}>
          <TabsList>
            <TabsTrigger value="find">Find Work</TabsTrigger>
            <TabsTrigger value="posts">My Job Posts</TabsTrigger>
            <TabsTrigger value="applications">My Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="mt-4">
            <div className="mb-4 text-sm text-gray-600">
              Showing jobs in your trade:{' '}
              <span className="font-medium">{currentUser.primaryTrade || '—'}</span>
            </div>

            {availableJobs.length > 0 ? (
              <div className="space-y-3">
                {availableJobs.map((job: any) => (
                  <JobCard key={job.id} job={job} showStatus={false} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <Briefcase className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No jobs available</h3>
                <p className="text-gray-600">Check back soon for new opportunities in your trade</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            {myPosts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myPosts.map((job: any) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <Briefcase className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No jobs posted yet</h3>
                <p className="mb-6 text-gray-600">Create your first job posting to find subcontractors</p>

                {showAbnGateForPosting ? (
                  <Link href={`/verify-business?returnUrl=${encodeURIComponent('/jobs')}`}>
                    <Button>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify ABN to Post
                    </Button>
                  </Link>
                ) : (
                  <Link href="/jobs/create">
                    <Button variant="secondary-green">
                      <Plus className="mr-2 h-4 w-4" />
                      Post Your First Job
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            {myApplications.length > 0 ? (
              <div className="space-y-3">
                {myApplications.map((app: any) => {
                  const job = jobs.find((j: any) => j.id === app.jobId);
                  if (!job) return null;
                  return <JobCard key={app.id} job={job} />;
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <Briefcase className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No applications yet</h3>
                <p className="text-gray-600">Apply for a job and your applications will show up here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
