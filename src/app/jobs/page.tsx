'use client';

/*
 * QA notes — ABN gating (Jobs list):
 * - /jobs loads for unverified users (browse allowed).
 * - Only "Post Job" / "Verify ABN to Post" is gated: unverified see CTA to verify; verified see Post Job.
 * - No TradeGate; hooks before any early return.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Plus, ShieldCheck, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/app-nav';
import { JobCard } from '@/components/job-card';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAuth } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { hasPremiumAccess } from '@/lib/billing/has-premium-access';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterPush } from '@/lib/safe-nav';
import { needsBusinessVerification, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { getTradeIcon } from '@/lib/trade-icons';

type JobsTab = 'find' | 'posts';

function normalizeJobRow(row: Record<string, unknown>): Record<string, unknown> {
  const rawDates: unknown[] = Array.isArray(row.dates) ? row.dates : [];
  const dates: Date[] = rawDates
    .filter(Boolean)
    .map((d) => new Date(d as string))
    .filter((d) => !isNaN(d.getTime()));

  const r = row as Record<string, unknown>;

  return {
    id: row.id,
    contractorId: row.contractor_id ?? row.contractorId,
    poster: (row as any).poster ?? null,
    poster_is_premium:
      (row as any).poster_is_premium ??
      (row as any).posterIsPremium ??
      (row as any).poster_premium ??
      (row as any).posterPremium ??
      null,
    poster_plan:
      (row as any).poster_plan ??
      (row as any).posterPlan ??
      (row as any).poster_active_plan ??
      (row as any).posterActivePlan ??
      null,
    title: row.title,
    description: row.description ?? '',
    tradeCategory: row.trade_category ?? row.tradeCategory ?? '',
    location: row.location ?? '',
    postcode: row.postcode ?? '',
    dates: dates.length > 0 ? dates : [new Date()],
    startTime: row.start_time ?? row.startTime,
    payType: row.pay_type ?? row.payType ?? 'fixed',
    rate: row.rate ?? 0,
    status: row.status ?? 'open',
    createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
    distance_km: r.distance_km ?? r.distanceKm ?? null,
    location_lat: r.location_lat ?? r.locationLat ?? null,
    location_lng: r.location_lng ?? r.locationLng ?? null,
  };
}

export default function JobsPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  const [tab, setTab] = useState<JobsTab>('find');
  const [visibleJobs, setVisibleJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'newest' | 'nearest'>('newest');

  const [myPostsDb, setMyPostsDb] = useState<any[]>([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);
  const [myPostsError, setMyPostsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<string | null>(null);

  // Compute ABN verified state (optional field right now)
  const showAbnGateForPosting = useMemo(
    () => !!currentUser && needsBusinessVerification(currentUser),
    [currentUser]
  );

  const userForDiscovery = currentUser
    ? {
        plan: (currentUser as any).plan ?? null,
        subscription_status:
          (currentUser as any).subscriptionStatus ?? (currentUser as any).subscription_status ?? null,
        complimentary_premium_until:
          (currentUser as any).complimentaryPremiumUntil ??
          (currentUser as any).complimentary_premium_until ??
          null,
      }
    : null;

  const isPremium = isPremiumForDiscovery(userForDiscovery);

  const [postLimitInfo, setPostLimitInfo] = useState<{
    unlimited: boolean;
    usedInWindow?: number;
    maxFree?: number;
    windowDays?: number;
  } | null>(null);

  const refreshPostLimit = useCallback(async () => {
    if (!currentUser?.id) return;
    if (isPremium) {
      setPostLimitInfo({ unlimited: true });
      return;
    }
    try {
      const res = await fetch('/api/jobs/post-limit', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostLimitInfo(null);
        return;
      }
      if (data.unlimited) {
        setPostLimitInfo({ unlimited: true });
        return;
      }
      setPostLimitInfo({
        unlimited: false,
        usedInWindow: data.usedInWindow ?? 0,
        maxFree: data.maxFree ?? 1,
        windowDays: data.windowDays ?? 30,
      });
    } catch {
      setPostLimitInfo(null);
    }
  }, [currentUser?.id, isPremium]);

  useEffect(() => {
    void refreshPostLimit();
  }, [refreshPostLimit]);

  const atFreeJobLimit =
    !isPremium &&
    postLimitInfo !== null &&
    !postLimitInfo.unlimited &&
    (postLimitInfo.usedInWindow ?? 0) >= (postLimitInfo.maxFree ?? 1);

  const freeJobUsageLine =
    postLimitInfo && !postLimitInfo.unlimited && postLimitInfo.maxFree != null && postLimitInfo.windowDays != null
      ? `${Math.min(postLimitInfo.usedInWindow ?? 0, postLimitInfo.maxFree)} of ${postLimitInfo.maxFree} free job posts used in the last ${postLimitInfo.windowDays} days.`
      : null;

  const allowedRadiusKm = isPremium ? 100 : 20;
  const TradeIcon = getTradeIcon(currentUser?.primaryTrade ?? undefined);

  const viewerTrades = useMemo(() => {
    const t = (currentUser as any)?.trades;
    if (Array.isArray(t) && t.length > 0) {
      return t.filter((x: string) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    }
    const pt = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade;
    return pt ? [String(pt).trim()] : [];
  }, [currentUser]);

  const tradeFilterForRpc = viewerTrades.length > 0 ? viewerTrades.join('|') : null;

  // Fetch Find Work jobs via RPC (server-enforced radius)
  useEffect(() => {
    const run = async () => {
      if (!currentUser?.id) return;
      if (tab !== 'find') return;

      setLoadingJobs(true);
      setJobsError(null);

      try {
        const supabase = getBrowserSupabase();

        const { data, error } = await (supabase as any).rpc('get_jobs_visible_to_viewer', {
          viewer_id: currentUser.id,
          trade_filter: tradeFilterForRpc,
          limit_count: 50,
          offset_count: 0,
        });

        if (error) {
          console.error('[jobs] rpc error', error);
          setVisibleJobs([]);
          setJobsError(error.message || 'Could not load jobs');
          return;
        }

        const rows = Array.isArray(data) ? data : [];
        const contractorIds = Array.from(new Set(rows.map((r: any) => r?.contractor_id).filter(Boolean)));
        let posterMap: Record<string, any> = {};
        if (contractorIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, business_name, avatar, rating')
            .in('id', contractorIds);
          if (Array.isArray(usersData)) {
            const users = usersData as { id: string }[];
            posterMap = Object.fromEntries(users.map((u) => [u.id, u]));
          }
        }
        const rowsWithPoster = rows.map((r: any) => ({
          ...r,
          poster: r?.contractor_id ? posterMap[r.contractor_id] ?? null : null,
        }));
        setVisibleJobs(rowsWithPoster.map((r) => normalizeJobRow(r as Record<string, unknown>)));
      } catch (e: any) {
        console.error('[jobs] unexpected error', e);
        setVisibleJobs([]);
        setJobsError('Could not load jobs');
      } finally {
        setLoadingJobs(false);
      }
    };

    run();
  }, [currentUser?.id, tab, tradeFilterForRpc]);

  // Fetch my posts from DB (owner view: jobs created by current user)
  useEffect(() => {
    const run = async () => {
      if (tab !== 'posts') return;

      if (!currentUser?.id) {
        setMyPostsDb([]);
        return;
      }

      setLoadingMyPosts(true);
      setMyPostsError(null);

      try {
        const supabase = getBrowserSupabase();

        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            poster:contractor_id(id, name, business_name, avatar, rating)
          `)
          .eq('contractor_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        setMyPostsDb(rows.map((r) => normalizeJobRow(r as Record<string, unknown>)));
      } catch (e: unknown) {
        console.error('[jobs] my posts load failed', e);
        setMyPostsDb([]);
        setMyPostsError(e instanceof Error ? e.message : 'Could not load your job posts');
      } finally {
        setLoadingMyPosts(false);
      }
    };

    run();
  }, [currentUser?.id, tab]);

  async function handleDeleteJob(jobId: string) {
    if (!currentUser?.id) {
      toast.error('You must be logged in.');
      return;
    }

    setDeletingId(jobId);

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (typeof data?.error === 'string' ? data.error : null) ??
          (res.status === 403 ? 'You do not have permission to delete this job.' : 'Delete failed');
        toast.error(msg);
        return;
      }

      toast.success('Job deleted');
      setMyPostsDb((prev: any[]) => (prev ?? []).filter((j) => j.id !== jobId));
      void refreshPostLimit();
    } catch (err) {
      console.error('[jobs] delete failed', err);
      toast.error('Could not delete job.');
    } finally {
      setDeletingId(null);
      setDeleteConfirmOpen(false);
      setDeleteConfirmJobId(null);
    }
  }

  const myPosts = useMemo(() => {
    if (tab !== 'posts') return [];
    return myPostsDb ?? [];
  }, [myPostsDb, tab]);

  const availableJobs = useMemo(() => {
    if (tab !== 'find') return [];
    const rows = (visibleJobs ?? []).slice();

    const getNum = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
    const isPrem = (j: Record<string, unknown>) =>
      hasPremiumAccess({
        plan: (j.poster_plan ?? j.posterPlan) as string | null,
        subscription_status: (j.poster_subscription_status ?? j.posterSubscriptionStatus) as string | null,
        complimentary_premium_until: (j.poster_complimentary_premium_until ??
          j.posterComplimentaryPremiumUntil) as string | null,
      }) || !!(j.poster_is_premium ?? j.posterIsPremium);

    // Always pin premium first
    rows.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const ap = isPrem(a) ? 1 : 0;
      const bp = isPrem(b) ? 1 : 0;
      if (bp !== ap) return bp - ap;

      if (sortMode === 'nearest') {
        const ad = getNum(a?.distance_km ?? a?.distanceKm);
        const bd = getNum(b?.distance_km ?? b?.distanceKm);
        if (ad != null && bd != null && ad !== bd) return ad - bd;
        if (ad == null && bd != null) return 1;
        if (ad != null && bd == null) return -1;
      }

      const at = a?.createdAt instanceof Date ? a.createdAt.getTime() : new Date((a?.created_at ?? 0) as string).getTime();
      const bt = b?.createdAt instanceof Date ? b.createdAt.getTime() : new Date((b?.created_at ?? 0) as string).getTime();
      return bt - at; // newest fallback
    });

    return rows;
  }, [visibleJobs, tab, sortMode]);

  // Redirect only after auth finishes initializing
  useEffect(() => {
    if (isLoading) return;
    if (hasRedirected.current) return;

    if (!currentUser) {
      hasRedirected.current = true;

      // defensive safety check
      if (router) {
        safeRouterPush(router, buildLoginUrl('/jobs'), buildLoginUrl('/jobs'));
      }
    }
  }, [isLoading, currentUser, router]);

  // ---- JobRow: full-width row used by both Find Work and My Job Posts ----
  function JobRow({
    job,
    showActions = false,
    onDeleteClick,
    deletingId,
  }: {
    job: any;
    showActions?: boolean;
    onDeleteClick?: (id: string) => void;
    deletingId?: string | null;
  }) {
    const deleteActions =
      showActions && onDeleteClick ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
          disabled={deletingId === job.id}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteClick(job.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Delete</span>
        </button>
      ) : undefined;

    return (
      <JobCard
        job={job}
        showStatus={showActions}
        extraActions={
          showActions && deleteActions ? (
            <div className="ml-3 flex items-center gap-2">{deleteActions}</div>
          ) : undefined
        }
      />
    );
  }

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

  return (
    <AppLayout>
      {/* Grey wrapper */}
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100">
        {/* dotted overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* watermark */}
        <div className="pointer-events-none absolute -right-[520px] -bottom-[520px] opacity-[0.06]">
          <img
            src="/TradeHub-Mark-blackout.svg"
            alt=""
            className="h-[1600px] w-[1600px]"
          />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {/* Header row */}
          <div className="mb-4 flex flex-col gap-2 sm:mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <Briefcase className="h-5 w-5 text-slate-800" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Jobs</h1>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Find subcontracting work or post jobs to hire subcontractors
              </p>
            </div>
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
                    <Link href={getVerifyBusinessUrl('/jobs')}>
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

          {!showAbnGateForPosting && !isPremium && postLimitInfo && !postLimitInfo.unlimited && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
                atFreeJobLimit ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white/90 text-slate-800'
              }`}
            >
              {atFreeJobLimit ? (
                <p>
                  <span className="font-semibold">Your free job limit has been reached.</span>{' '}
                  <Link href="/pricing" className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">
                    Upgrade for unlimited jobs
                  </Link>
                  .
                </p>
              ) : freeJobUsageLine ? (
                <p>{freeJobUsageLine}</p>
              ) : null}
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as JobsTab)}>
            {/* Main surface */}
            <Card className="border-black/5 bg-white/75 shadow-sm backdrop-blur">
              <CardHeader className="border-b border-black/5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Tabs */}
                  <TabsList className="w-full justify-start rounded-2xl bg-slate-100/80 p-1 ring-1 ring-black/5 sm:w-auto">
                    <TabsTrigger value="find" className="rounded-xl px-4">
                      Find Work
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl px-4">
                      My Job Posts
                    </TabsTrigger>
                  </TabsList>

                  {/* CTA (keep ABN gate exactly) */}
                  {showAbnGateForPosting ? (
                    <Link href={getVerifyBusinessUrl('/jobs')}>
                      <Button className="h-10 gap-2 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-[0.99]">
                        <ShieldCheck className="h-4 w-4" />
                        Verify ABN to Post
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : atFreeJobLimit ? (
                    <div className="flex flex-col items-stretch gap-1 sm:items-end">
                      <Button
                        type="button"
                        variant="primary-green"
                        className="h-10 gap-2 rounded-xl opacity-60 shadow-sm"
                        disabled
                        aria-disabled
                      >
                        <Plus className="h-4 w-4" />
                        Post Job
                      </Button>
                      <span className="max-w-[14rem] text-right text-xs text-amber-900 sm:max-w-none">
                        Free limit reached — upgrade for unlimited posting.
                      </span>
                    </div>
                  ) : (
                    <Link href="/jobs/create">
                      <Button
                        variant="primary-green"
                        className="h-10 gap-2 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
                      >
                        <Plus className="h-4 w-4" />
                        Post Job
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                <TabsContent value="find" className="mt-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <span>Showing jobs in your trade:</span>
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                          {TradeIcon ? <TradeIcon className="h-4 w-4 text-blue-600" /> : null}
                          {String(currentUser?.primaryTrade || 'Your trade')}
                        </span>
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
                        <span className="text-slate-500">Radius</span>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {allowedRadiusKm}km radius
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Sort:</span>

                      <button
                        type="button"
                        onClick={() => setSortMode('newest')}
                        className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-black/5 ${
                          sortMode === 'newest'
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-100/70 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Newest
                      </button>

                      <button
                        type="button"
                        onClick={() => setSortMode('nearest')}
                        className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-black/5 ${
                          sortMode === 'nearest'
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-100/70 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Nearest
                      </button>
                    </div>
                  </div>

                  {loadingJobs ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                          <div className="h-4 w-2/3 rounded bg-slate-200" />
                          <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                          <div className="mt-4 h-10 w-full rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : jobsError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                      <p className="text-sm font-medium text-red-900">Could not load jobs</p>
                      <p className="mt-1 text-sm text-red-800">{jobsError}</p>
                      <div className="mt-3">
                        <Button size="sm" onClick={() => toast.info('Tip: check Supabase logs for RPC errors')}>
                          OK
                        </Button>
                      </div>
                    </div>
                  ) : availableJobs.length > 0 ? (
                    <div className="space-y-3">
                      {availableJobs.map((job: any) => (
                        <JobRow key={job.id} job={job} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!isPremium && (
                        <PremiumUpsellBar
                          title={`No jobs within your ${allowedRadiusKm}km radius.`}
                          description="Premium expands your radius to 100km and unlocks search-from location — so you can find work anywhere you're building."
                        />
                      )}

                      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                        <Briefcase className="mx-auto mb-4 h-16 w-16 text-slate-400" />
                        <h3 className="mb-2 text-lg font-semibold text-slate-900">
                          No jobs in your radius
                        </h3>
                        <p className="text-slate-600">
                          We couldn&apos;t find open jobs within {allowedRadiusKm}km for your trade right now.
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Try again later — new jobs appear as builders post work.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="posts" className="mt-6">
                  {loadingMyPosts ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                          <div className="h-4 w-2/3 rounded bg-slate-200" />
                          <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                          <div className="mt-4 h-10 w-full rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : myPostsError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                      <p className="text-sm font-medium text-red-900">Could not load your job posts</p>
                      <p className="mt-1 text-sm text-red-800">{myPostsError}</p>
                    </div>
                  ) : myPosts.length > 0 ? (
                    <div className="space-y-3">
                      {myPosts.map((job: any) => (
                        <JobRow
                          key={job.id}
                          job={job}
                          showActions
                          onDeleteClick={(id) => {
                            setDeleteConfirmJobId(id);
                            setDeleteConfirmOpen(true);
                          }}
                          deletingId={deletingId}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/60 px-6 py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                        <Briefcase className="h-6 w-6 text-slate-500" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">No jobs posted yet</div>
                      <div className="mt-1 max-w-md text-sm text-slate-600">
                        Create your first job posting to find subcontractors
                      </div>

                      <div className="mt-5">
                        {showAbnGateForPosting ? (
                          <Link href={getVerifyBusinessUrl('/jobs')}>
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
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>

      {/* Confirm Delete Job */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this job and its related data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deletingId || !deleteConfirmJobId}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirmJobId && !deletingId) handleDeleteJob(deleteConfirmJobId);
              }}
            >
              {deletingId ? 'Deleting…' : 'Delete Job'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
