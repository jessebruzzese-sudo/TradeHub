// @ts-nocheck
'use client';

/*
 * QA notes — ABN gating (Job detail):
 * - /jobs/[id] loads for unverified users (browse allowed).
 * - Apply, Select, Accept, Confirm Hire (and other commit actions) are blocked for unverified:
 *   disabled button + "Verify ABN to apply" (or equivalent) + CTA link to /verify-business.
 * - Verified users can create/apply as normal. No TradeGate.
 */

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import type { PayType, JobStatus, User, UserRole, TrustStatus } from '@/lib/types';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';
import { formatJobPriceDisplay } from '@/lib/job-pay-labels';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Crown,
  CheckCircle,
  XCircle,
  Ban,
  AlertCircle,
  Flag,
  MessageSquare,
  Edit,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CancelJobDialog } from '@/components/cancel-job-dialog';
import { ReliabilityReviewForm } from '@/components/reliability-review-form';
import { JobStatusMessage } from '@/components/job-status-message';
import { canLeaveReliabilityReview } from '@/lib/cancellation-utils';
import { getJobLifecycleState, canWithdrawApplication, canTransitionToStatus } from '@/lib/job-lifecycle';
import { createSystemMessage, shouldAddSystemMessage } from '@/lib/messaging-utils';
import { needsBusinessVerification, redirectToVerifyBusiness, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { hasValidABN } from '@/lib/abn-utils';
import { isAdmin } from '@/lib/is-admin';
import { ownsJob } from '@/lib/permissions';
import { trackEvent } from '@/lib/analytics';

function AttachmentRow({
  attachment,
  onImageClick,
}: {
  attachment: any;
  onImageClick?: (img: { url: string; name: string }) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  const supabase = useState(() => getBrowserSupabase())[0];

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!attachment) return;

      // Legacy: string url
      if (typeof attachment === 'string') {
        if (attachment.startsWith('blob:')) return;
        if (alive) setUrl(attachment);
        return;
      }

      // Schema: { name, path, size, type, bucket }
      const bucket = attachment?.bucket ?? 'job-attachments';
      const path = attachment?.path;

      // If a direct URL was ever stored, use it
      if (attachment?.url) {
        if (alive) setUrl(String(attachment.url));
        return;
      }

      if (!path) return;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60); // 1 hour

      if (!alive) return;

      if (error) {
        console.warn('Signed URL error', error);
        return;
      }

      setUrl(data?.signedUrl ?? null);
    }

    run();
    return () => {
      alive = false;
    };
  }, [attachment, supabase]);

  const name =
    typeof attachment === 'string'
      ? attachment.split('/').pop() || 'Attachment'
      : attachment?.name ?? attachment?.path?.split('/')?.pop() ?? 'Attachment';

  const type = typeof attachment === 'string' ? '' : String(attachment?.type ?? '');
  const size = typeof attachment === 'string' ? undefined : (typeof attachment?.size === 'number' ? attachment.size : undefined);

  const ext = (name.split('.').pop() || '').toLowerCase();
  const isImage =
    (type && type.startsWith('image/')) || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext);

  const isPdf = type === 'application/pdf' || ext === 'pdf';

  const prettySize =
    typeof size === 'number'
      ? size >= 1024 * 1024
        ? `${(size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(size / 1024))} KB`
      : null;

  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <FileText className="h-4 w-4 text-slate-500" />
        <span className="truncate">{name}</span>
        <span className="ml-auto text-xs text-slate-500">Preparing…</span>
      </div>
    );
  }

  // ✅ Image tile (for grid)
  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.({ url, name })}
        className="group w-full text-left"
        title="View image"
      >
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="aspect-[4/3] bg-slate-100">
            <img
              src={url}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
          <div className="p-2">
            <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
            <div className="text-xs text-slate-500">
              {prettySize ? `Image • ${prettySize}` : 'Image'}
            </div>
          </div>
        </div>
      </button>
    );
  }

  // ✅ File row
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-700 truncate">{name}</span>
      </div>

      {isPdf ? (
        <span className="text-xs text-slate-500">
          {prettySize ? `View PDF • ${prettySize}` : 'View PDF'}
        </span>
      ) : (
        <span className="flex items-center gap-2 text-xs text-slate-500">
          {prettySize ? prettySize : null}
          <Download className="h-4 w-4 text-slate-400" />
        </span>
      )}
    </a>
  );
}

function formatDateRange(dates: (string | Date)[] | undefined): string | null {
  if (!dates || dates.length === 0) return null;

  const parsed = dates
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (parsed.length === 0) return null;

  const first = parsed[0];
  const last = parsed[parsed.length - 1];

  const sameDay = first.toDateString() === last.toDateString();

  const format = (date: Date) =>
    date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return sameDay
    ? format(first)
    : `${format(first)} - ${format(last)}`;
}

function normalizeDates(input: any): Date[] {
  const arr: any[] = Array.isArray(input) ? input : [];
  return arr
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
}

function isConsecutiveDays(dates: Date[]): boolean {
  if (dates.length <= 1) return true;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const next = new Date(dates[i]);
    prev.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);
    const diff = next.getTime() - prev.getTime();
    if (diff !== 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

function formatAu(date: Date) {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatJobDatesDisplay(input: any): { label: string; badge?: string } | null {
  const dates = normalizeDates(input);
  if (!dates.length) return null;

  if (dates.length === 1) {
    return { label: formatAu(dates[0]) };
  }

  const first = dates[0];
  const last = dates[dates.length - 1];
  const consecutive = isConsecutiveDays(dates);

  if (consecutive) {
    const days = Math.round(
      (new Date(last).setHours(0, 0, 0, 0) - new Date(first).setHours(0, 0, 0, 0)) /
        (24 * 60 * 60 * 1000)
    ) + 1;

    return {
      label: `${formatAu(first)} - ${formatAu(last)}`,
      badge: `${days} day${days === 1 ? '' : 's'}`,
    };
  }

  // Non-consecutive picked dates (e.g. Mon/Wed/Fri)
  return {
    label: `Multiple dates (${dates.length})`,
    badge: `${dates.length} day${dates.length === 1 ? '' : 's'}`,
  };
}

export default function JobDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const store = getStore();
  const jobId = params.id as string;

  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  type LightboxItem = {
    name: string;
    url?: string;
    bucket?: string;
    path?: string;
  };
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const sb = useState(() => getBrowserSupabase())[0];

  useEffect(() => {
    const fetchJobIfNeeded = async () => {
      if (!jobId || isLoadingJob) return;

      const existingJob: any = store.getJobById(jobId);

      // ✅ Only skip fetch if cached job already has BOTH attachments AND dates loaded
      // Prevents stale single-date display after editing multiple dates.
      const cachedHasAttachments =
        Array.isArray(existingJob?.attachments) && existingJob.attachments.length > 0;

      const cachedHasDates =
        Array.isArray(existingJob?.dates) && existingJob.dates.length > 0;

      if (existingJob && cachedHasAttachments && cachedHasDates) return;

      setIsLoadingJob(true);
      try {
        const supabase = getBrowserSupabase();
        const { data: jobData, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching job:', error);
          return;
        }

        if (jobData) {
          const rawDates: unknown[] = Array.isArray(jobData.dates)
            ? jobData.dates
            : [];
          const dates: Date[] = rawDates
            .filter(Boolean)
            .map((d) => new Date(d as string))
            .filter((d) => !isNaN(d.getTime()));

          let durationDays = 0;
          if (dates.length >= 2) {
            const timestamps = dates.map((d) => d.getTime());
            const earliest = Math.min(...timestamps);
            const latest = Math.max(...timestamps);
            durationDays =
              Math.round((latest - earliest) / (1000 * 60 * 60 * 24)) + 1;
          } else if (dates.length === 1) {
            durationDays = 1;
          }

          const job = {
            id: jobData.id,
            title: jobData.title,
            description: jobData.description,
            tradeCategory: jobData.trade_category,
            contractorId: jobData.contractor_id,
            location: jobData.location,
            postcode: jobData.postcode,
            dates,
            payType: jobData.pay_type as PayType,
            rate: jobData.rate ?? 0,
            duration: durationDays > 0 ? durationDays : (jobData.duration ?? undefined),
            status: jobData.status as unknown as JobStatus,
            createdAt: new Date(jobData.created_at ?? Date.now()),
            cancelledAt: jobData.cancelled_at ? new Date(jobData.cancelled_at) : undefined,
            cancelledBy: jobData.cancelled_by ?? undefined,
            cancellationReason: jobData.cancellation_reason ?? undefined,
            attachments: jobData.attachments,
            startTime: jobData.start_time || undefined,
            selectedSubcontractor: jobData.selected_subcontractor || undefined,
            confirmedSubcontractor: jobData.confirmed_subcontractor || undefined,
          };

          if (existingJob) {
            // ✅ Update cached job with fresh DB fields (including attachments)
            store.updateJob(jobData.id, {
              description: jobData.description,
              location: jobData.location,
              postcode: jobData.postcode,
              dates,
              payType: jobData.pay_type as PayType,
              rate: jobData.rate ?? 0,
              duration: durationDays > 0 ? durationDays : (jobData.duration ?? undefined),
              status: jobData.status as unknown as JobStatus,
              cancelledAt: jobData.cancelled_at ? new Date(jobData.cancelled_at) : undefined,
              cancelledBy: jobData.cancelled_by ?? undefined,
              cancellationReason: jobData.cancellation_reason ?? undefined,

              // ✅ key fields
              attachments: (jobData.attachments as any) ?? undefined,

              startTime: jobData.start_time || undefined,
              selectedSubcontractor: jobData.selected_subcontractor || undefined,
              confirmedSubcontractor: jobData.confirmed_subcontractor || undefined,
            });
          } else {
            store.jobs.push(job as any);
          }

          // Fetch poster (jobData.contractor_id) into store if missing
          if (jobData.contractor_id) {
            const existingPoster = store.getUserById(jobData.contractor_id);

            if (!existingPoster) {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', jobData.contractor_id)
                .maybeSingle();

              if (userData) {
                const user: User = {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  role: userData.role as UserRole,
                  trustStatus: (userData.trust_status || 'pending') as TrustStatus,
                  rating: userData.rating || 0,
                  reliabilityRating: userData.reliability_rating ?? undefined,
                  completedJobs: userData.completed_jobs || 0,
                  memberSince: new Date(userData.created_at ?? Date.now()),
                  createdAt: new Date(userData.created_at ?? Date.now()),
                  primaryTrade: userData.primary_trade ?? undefined,
                  additionalTrades: userData.additional_trades || [],
                  additionalTradesUnlocked: userData.additional_trades_unlocked || false,
                  businessName: userData.business_name ?? undefined,
                  abn: userData.abn ?? undefined,
                  bio: userData.bio ?? undefined,
                  trades: getDisplayTradeListFromUserRow({
                    primary_trade: userData.primary_trade,
                    additional_trades: userData.additional_trades as string[] | null,
                  }),
                  location: userData.location ?? undefined,
                  postcode: userData.postcode ?? undefined,
                  radius: userData.radius ?? undefined,
                  availability: userData.availability as User['availability'],
                  avatar: userData.avatar ?? undefined,
                  subcontractorPlan: userData.subcontractor_plan as User['subcontractorPlan'],
                  abnStatus: userData.abn_status as User['abnStatus'],
                  abnVerifiedAt: userData.abn_verified_at ?? undefined,
                  abnVerifiedBy: userData.abn_verified_by ?? undefined,
                  abnRejectionReason: userData.abn_rejection_reason ?? undefined,
                  abnSubmittedAt: userData.abn_submitted_at ?? undefined,
                };

                store.users.push(user);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setIsLoadingJob(false);
      }
    };

    fetchJobIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, isLoadingJob]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const len = lightboxItems.length;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft' && len > 1) {
        setLightboxIndex((i) => (i - 1 + len) % len);
      }
      if (e.key === 'ArrowRight' && len > 1) {
        setLightboxIndex((i) => (i + 1) % len);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, lightboxItems.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    if (!lightboxItems.length) return;

    const item = lightboxItems[lightboxIndex];
    if (!item) return;

    // Already have URL (string attachments or previously signed)
    if (item.url) return;

    // Need bucket+path to sign
    if (!item.bucket || !item.path) return;

    let alive = true;

    (async () => {
      const { data, error } = await sb.storage
        .from(item.bucket!)
        .createSignedUrl(item.path!, 60 * 60); // 1 hour

      if (!alive) return;

      if (error) {
        console.warn('Lightbox signed URL error', error);
        return;
      }

      const signedUrl = data?.signedUrl ?? null;
      if (!signedUrl) return;

      // Patch only the active item
      setLightboxItems((prev) => {
        const copy = [...prev];
        const current = copy[lightboxIndex];
        if (!current) return prev;
        copy[lightboxIndex] = { ...current, url: signedUrl };
        return copy;
      });
    })();

    return () => {
      alive = false;
    };
  }, [lightboxOpen, lightboxIndex, lightboxItems.length, sb, lightboxItems]);

  const job = store.getJobById(jobId);
  const poster = job ? store.getUserById(job.contractorId) : null;
  const applications = job ? store.getApplicationsByJob(job.id) : [];

  // “My application” = any application made by the current user (single-account model)
  const myApplication = applications.find((a) => a.subcontractorId === currentUser?.id);

  const isAdminUser = isAdmin(currentUser);
  const isMyJob = job && currentUser ? ownsJob(currentUser, job) : false;

  const lifecycleState = job ? getJobLifecycleState(job, applications.length > 0) : null;

  // In single-account model: anyone who is NOT the job owner can apply (unless admin overrides are supported elsewhere)
  const canApply = !!currentUser && !!job && !isMyJob && lifecycleState?.allowsApplications && !myApplication;

  // Anyone (who is not job owner) can message poster as long as job isn’t closed/cancelled
  const canMessage =
    !!currentUser && !!job && !isMyJob && job.status !== 'cancelled' && job.status !== 'closed';

  const canWithdraw = myApplication
    ? canWithdrawApplication(myApplication.status, job?.status || 'open')
    : false;

  const viewerTrades = useMemo(() => {
    const t = (currentUser as any)?.trades;
    if (Array.isArray(t) && t.length > 0) {
      return t.filter((x: string) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    }
    const pt = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade;
    const at = (currentUser as any)?.additionalTrades ?? (currentUser as any)?.additional_trades;
    const out = pt ? [String(pt).trim()] : [];
    if (Array.isArray(at)) {
      at.forEach((x: string) => {
        const s = String(x).trim();
        if (s && !out.includes(s)) out.push(s);
      });
    }
    return out;
  }, [currentUser]);

  if (isLoadingJob || !currentUser) {
    return (
      <AppLayout>
        {/* Grey wrapper (match /jobs) */}
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100">
          {/* dotted overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
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
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <div className="text-gray-600">Loading...</div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!job || !poster) {
    return (
      <AppLayout>
        {/* Grey wrapper (match /jobs) */}
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100">
          {/* dotted overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
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
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Job not found</h2>
                <Link href="/jobs">
                  <Button variant="outline">Back to Jobs</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Trade gate — allow admin + poster to view; otherwise viewer must have job's trade in their listed trades
  const jobTradeMatchesViewer = viewerTrades.length > 0 && viewerTrades.includes(job.tradeCategory);
  if (!isMyJob && !isAdminUser && !jobTradeMatchesViewer) {
    return (
      <AppLayout>
        {/* Grey wrapper (match /jobs) */}
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100">
          {/* dotted overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
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
            <div className="max-w-4xl mx-auto">
              <Link
                href="/jobs"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Jobs
              </Link>
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">This job isn't available for your trade.</h2>
                <p className="text-gray-600 mb-6">
                  TradeHub only shows work that matches your listed trade(s) to keep listings relevant.
                </p>
                <Link href="/jobs">
                  <Button variant="outline">← Back to Jobs</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const needsAbnForActions = needsBusinessVerification(currentUser);
  const returnUrl = `/jobs/${jobId}`;
  const attachments = (job as any)?.attachments ?? [];

  const canGoPrev = lightboxItems.length > 1;
  const canGoNext = lightboxItems.length > 1;

  const goPrev = () => {
    if (!lightboxItems.length) return;
    setLightboxIndex((i) => (i - 1 + lightboxItems.length) % lightboxItems.length);
  };

  const goNext = () => {
    if (!lightboxItems.length) return;
    setLightboxIndex((i) => (i + 1) % lightboxItems.length);
  };

  const activeLightbox = lightboxItems[lightboxIndex] ?? null;

  const handleStartApply = () => {
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    setShowApplyDialog(true);
  };

  const handleApply = () => {
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    trackEvent('job_apply_clicked', {
      jobId: job.id,
    });
    const newApplication = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      subcontractorId: currentUser.id,
      status: 'applied' as const,
      appliedAt: new Date(),
      message: applicationMessage,
    };
    store.createApplication(newApplication);
    setShowApplyDialog(false);
    setApplicationMessage('');
  };

  const callJobAction = async (action: string, applicationId?: string) => {
    const res = await fetch(`/api/jobs/${job.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, applicationId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Action failed');
    return data;
  };

  const handleSelectApplication = async (applicationId: string) => {
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    const application = store.getApplicationById(applicationId);
    if (!application) return;
    const transition = canTransitionToStatus('open', 'accepted', { hasSelectedSubcontractor: true });
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      await callJobAction('select', applicationId);
      store.updateJob(job.id, { status: 'accepted', selectedSubcontractor: application.subcontractorId });
      store.updateApplication(applicationId, { status: 'selected' });
      toast.success('Subcontractor selected');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to select');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    const transition = canTransitionToStatus('accepted', 'confirmed');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      await callJobAction('accept');
      store.updateJob(job.id, { status: 'confirmed' });
      if (myApplication) store.updateApplication(myApplication.id, { status: 'accepted', respondedAt: new Date() });
      toast.success('Job accepted!');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to accept');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDecline = async () => {
    const transition = canTransitionToStatus('accepted', 'open');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      await callJobAction('decline');
      store.updateJob(job.id, { status: 'open', selectedSubcontractor: undefined });
      if (myApplication) store.updateApplication(myApplication.id, { status: 'declined', respondedAt: new Date() });
      toast.success('Job declined');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to decline');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleConfirmHire = async () => {
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    if (!lifecycleState?.canConfirmHire) {
      alert('Cannot confirm hire at this time');
      return;
    }
    const transition = canTransitionToStatus('accepted', 'confirmed', {
      hasSelectedSubcontractor: !!job.selectedSubcontractor,
    });
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }
    setActionSubmitting(true);
    try {
      await callJobAction('confirm');
      store.updateJob(job.id, { status: 'confirmed', confirmedSubcontractor: job.selectedSubcontractor });
      const selectedApp = applications.find((a) => a.subcontractorId === job.selectedSubcontractor);
      if (selectedApp) store.updateApplication(selectedApp.id, { status: 'confirmed' });
      toast.success('Hire confirmed!');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to confirm');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleWithdrawApplication = () => {
    if (!myApplication) return;

    store.updateApplication(myApplication.id, {
      status: 'declined',
      withdrawnAt: new Date(),
      withdrawnReason: withdrawReason,
    });
    setShowWithdrawDialog(false);
    setWithdrawReason('');
    router.refresh();
  };

  async function handleCloseJob() {
    if (!currentUser?.id) {
      toast.error('You must be logged in.');
      return;
    }
    if (!job) return;

    setIsClosing(true);

    try {
      const supabase = getBrowserSupabase();

      const { error } = await supabase
        .from('jobs')
        .update({ status: 'closed' })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Job closed successfully');
      router.refresh();
    } catch (err) {
      console.error('[jobs] close failed', err);
      toast.error('Could not close job. Check permissions.');
    } finally {
      setIsClosing(false);
    }
  }

  const handleCompleteJob = () => {
    if (!lifecycleState?.canComplete) {
      alert('Cannot complete job at this time');
      return;
    }

    const transition = canTransitionToStatus('confirmed', 'completed');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }

    store.updateJob(job.id, { status: 'completed' });
    const confirmedApp = applications.find((a) => a.subcontractorId === job.confirmedSubcontractor);
    if (confirmedApp) {
      store.updateApplication(confirmedApp.id, { status: 'completed' });
    }

    const conversation = store.getConversationForJob(
      job.id,
      job.contractorId,
      job.confirmedSubcontractor ?? job.selectedSubcontractor
    );

    if (conversation) {
      const messages = store.getMessagesByConversation(conversation.id);
      if (shouldAddSystemMessage(messages, 'completed')) {
        const systemMsg = createSystemMessage(conversation.id, 'completed');
        store.addMessage(systemMsg);
      }
    }

    router.refresh();
  };

  const handleCancelJob = (reason: string) => {
    const wasAccepted = job.status === 'accepted' || job.status === 'confirmed';

    store.updateJob(job.id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: currentUser.id,
      cancellationReason: reason,
      wasAcceptedOrConfirmedBeforeCancellation: wasAccepted,
    });

    const conversation = store.getConversationForJob(
      job.id,
      job.contractorId,
      job.confirmedSubcontractor ?? job.selectedSubcontractor
    );

    if (conversation) {
      const messages = store.getMessagesByConversation(conversation.id);
      if (shouldAddSystemMessage(messages, 'cancelled')) {
        const systemMsg = createSystemMessage(conversation.id, 'cancelled', reason);
        store.addMessage(systemMsg);
      }
    }

    router.refresh();
  };

  const handleSubmitReview = async (review: any) => {
    store.createReview({
      ...review,
      id: `review-${Date.now()}`,
      authorId: currentUser.id,
      createdAt: new Date(),
    });

    // Best-effort notification email side effect.
    try {
      if (review?.recipientId && review?.jobId) {
        await fetch('/api/reliability-reviews/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: review.recipientId,
            jobId: review.jobId,
          }),
        });
      }
    } catch (err) {
      console.warn('[jobs/[id]] reliability review email trigger failed', err);
    }

    router.refresh();
  };

  const handleMessagePoster = () => {
    const conversation = store.findOrCreateConversation(job.id, job.contractorId, currentUser.id);
    router.push(`/messages?conversation=${conversation.id}`);
  };

  const canCancelJob =
    lifecycleState?.canCancel &&
    (isMyJob || job.selectedSubcontractor === currentUser.id || job.confirmedSubcontractor === currentUser.id);

  const canLeaveReview = job.status === 'cancelled' && canLeaveReliabilityReview(job, currentUser.id);

  const existingReview = canLeaveReview
    ? store.getReviewsByJob(job.id).find((r) => r.authorId === currentUser.id)
    : null;

  const recipientId = isMyJob ? job.confirmedSubcontractor || job.selectedSubcontractor : job.contractorId;
  const recipient = recipientId ? store.getUserById(recipientId) : null;

  // ✅ Single dashboard route (no more /dashboard/contractor or /dashboard/subcontractor)
  const dashboardHref = '/dashboard';

  return (
    <AppLayout>
      {/* Grey wrapper (match /jobs) */}
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
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
            <Link
              href="/jobs"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Jobs
            </Link>

            <Link href={dashboardHref}>
              <Button variant="outline" size="sm">
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-300 bg-slate-50 p-6 mb-6">
            <div className="mb-6 pb-6 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Posted by</h3>

              <Link href={`/users/${poster.id}`} className="block group">
                <div
                  className={[
                    'relative flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all duration-200',
                    'hover:bg-slate-50 hover:border-slate-200',
                    // Premium glow
                    (poster as any)?.isPremium ||
                    (poster as any)?.is_premium ||
                    (poster as any)?.subscription_status === 'active'
                      ? 'ring-2 ring-amber-300/50 shadow-[0_0_0_6px_rgba(251,191,36,0.08)]'
                      : 'border-slate-200'
                  ].join(' ')}
                >
                  {/* Premium badge (top right) */}
                  {((poster as any)?.isPremium ||
                    (poster as any)?.is_premium ||
                    (poster as any)?.subscription_status === 'active') && (
                    <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                      <Crown className="h-3.5 w-3.5 text-amber-700" />
                      Premium
                    </div>
                  )}

                  {/* Avatar (larger) */}
                  <UserAvatar
                    avatarUrl={poster.avatar}
                    userName={poster.name || 'TradeHub user'}
                    size="xl"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {poster.name || 'TradeHub user'}
                      </p>

                      {/* Verified badge */}
                      {hasValidABN(poster) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          <BadgeCheck className="h-3.5 w-3.5 text-blue-600" />
                          Verified
                        </span>
                      )}
                    </div>

                    {poster.businessName && (
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {poster.businessName}
                      </p>
                    )}

                    {typeof (poster as any)?.rating === 'number' && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-slate-700">
                          {(poster as any).rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Subtle CTA */}
                    <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-700">
                      View profile
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
                <p className="text-gray-600">{job.tradeCategory}</p>
              </div>
              <div className="flex items-center gap-3">
                {isMyJob && job.status === 'open' && (
                  <Link href={`/jobs/${job.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Post
                    </Button>
                  </Link>
                )}
                <StatusPill type="job" status={job.status} />
              </div>
            </div>

            {lifecycleState && (
              <div className="mb-4">
                <JobStatusMessage
                  message={lifecycleState.statusMessage}
                  warning={lifecycleState.warningMessage}
                  type={lifecycleState.isExpired ? 'error' : lifecycleState.warningMessage ? 'warning' : 'info'}
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>
                  {job.location}, {job.postcode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-slate-700">
                  {formatDateRange(job.dates)}
                </span>
              </div>
              {job.startTime && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <span>{job.startTime}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>{formatJobPriceDisplay(job, 'long')}</span>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-300 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-3">
                Description
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {Array.isArray(attachments) && attachments.length > 0 && (() => {
              const isImage = (a: any) => {
                const name = typeof a === 'string' ? (a.split('/').pop() || '') : String(a?.name ?? '');
                const type = typeof a === 'string' ? '' : String(a?.type ?? '');
                const ext = (name.split('.').pop() || '').toLowerCase();
                return (type && type.startsWith('image/')) || ['jpg','jpeg','png','webp','gif','heic'].includes(ext);
              };

              const imageAttachments = attachments.filter(isImage);
              const lightboxList = imageAttachments.map((a: any) => ({
                url: '',
                name: typeof a === 'string' ? (a.split('/').pop() || 'Image') : (a?.name ?? 'Image'),
                _raw: a,
              }));
              const fileAttachments = attachments.filter((a: any) => !isImage(a));

              return (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Attachments</h3>

                  {imageAttachments.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {imageAttachments.map((a: any, idx: number) => (
                          <AttachmentRow
                            key={a?.path ?? idx}
                            attachment={a}
                            onImageClick={(img) => {
                              const items: LightboxItem[] = imageAttachments.map((a: any) => {
                                if (typeof a === 'string') {
                                  return { name: a.split('/').pop() || 'Image', url: a };
                                }
                                return {
                                  name: a?.name ?? a?.path?.split('/')?.pop() ?? 'Image',
                                  bucket: a?.bucket ?? 'job-attachments',
                                  path: a?.path,
                                };
                              });

                              const clickedName = img.name;
                              const idx = items.findIndex((x) => x.name === clickedName);

                              // Inject the clicked signed URL immediately (best UX)
                              if (idx >= 0) items[idx] = { ...items[idx], url: img.url };

                              setLightboxItems(items);
                              setLightboxIndex(Math.max(0, idx));
                              setLightboxOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {fileAttachments.length > 0 && (
                    <div className="space-y-2">
                      {fileAttachments.map((a: any, idx: number) => (
                        <AttachmentRow key={a?.path ?? idx} attachment={a} />
                      ))}
                    </div>
                  )}

                  <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogContent className="max-w-5xl">
                      <DialogHeader>
                        <DialogTitle className="truncate">{activeLightbox?.name ?? 'Image'}</DialogTitle>
                      </DialogHeader>

                      <div className="relative mt-2 overflow-hidden rounded-xl border bg-black/5">
                        {/* Close button */}
                        <button
                          type="button"
                          onClick={() => setLightboxOpen(false)}
                          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        {/* Prev */}
                        {canGoPrev && (
                          <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                        )}

                        {/* Next */}
                        {canGoNext && (
                          <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        )}

                        {activeLightbox?.url ? (
                          <img
                            src={activeLightbox.url}
                            alt={activeLightbox.name}
                            className="w-full h-auto"
                          />
                        ) : (
                          <div className="p-10 text-center text-sm text-slate-600">
                            Loading image…
                          </div>
                        )}
                      </div>

                      {lightboxItems.length > 1 && (
                        <div className="mt-3 text-center text-xs text-slate-500">
                          {lightboxIndex + 1} / {lightboxItems.length}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })()}

            {canApply && (
              <div className="space-y-3">
                {needsAbnForActions ? (
                  <div className="space-y-2">
                    <Button disabled className="w-full">
                      Apply for this Job
                    </Button>
                    <p className="text-sm text-amber-700">
                      Verify your ABN to continue.{' '}
                      <Link href={getVerifyBusinessUrl(returnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                        Verify ABN
                      </Link>
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleStartApply} className="w-full">
                    Apply for this Job
                  </Button>
                )}
                {canMessage && (
                  <Button onClick={handleMessagePoster} variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message Poster
                  </Button>
                )}
              </div>
            )}

            {!canApply && canMessage && !myApplication && (
              <Button onClick={handleMessagePoster} variant="outline" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Poster
              </Button>
            )}

            {myApplication && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">You applied for this job</p>
                  <p className="text-sm text-blue-700">Status: {myApplication.status}</p>
                  {myApplication.withdrawnAt && (
                    <p className="text-xs text-gray-600 mt-1">
                      Withdrawn on {format(myApplication.withdrawnAt, 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {canWithdraw && (
                    <Button onClick={() => setShowWithdrawDialog(true)} variant="outline" size="sm" className="flex-1">
                      <Flag className="w-4 h-4 mr-2" />
                      Withdraw Application
                    </Button>
                  )}
                  {canMessage && (
                    <Button
                      onClick={handleMessagePoster}
                      variant="outline"
                      size="sm"
                      className={canWithdraw ? 'flex-1' : 'w-full'}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message Poster
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Applicant decision (single-account model):
                If current user is the selected person and job is accepted, allow accept/decline */}
            {!isMyJob && job.status === 'accepted' && job.selectedSubcontractor === currentUser.id && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Button onClick={handleAccept} className="flex-1" disabled={needsAbnForActions || actionSubmitting}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {actionSubmitting ? 'Accepting...' : 'Accept'}
                  </Button>
                  <Button onClick={handleDecline} variant="outline" className="flex-1" disabled={actionSubmitting}>
                    <XCircle className="w-4 h-4 mr-2" />
                    {actionSubmitting ? 'Declining...' : 'Decline'}
                  </Button>
                </div>
                {needsAbnForActions && (
                  <p className="text-sm text-amber-700">
                    Verify your ABN to continue.{' '}
                    <Link href={getVerifyBusinessUrl(returnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                      Verify ABN
                    </Link>
                  </p>
                )}
              </div>
            )}

            {isMyJob && job.status === 'accepted' && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirmHire}
                    className="flex-1"
                    disabled={!lifecycleState?.canConfirmHire || needsAbnForActions || actionSubmitting}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {actionSubmitting ? 'Confirming...' : 'Confirm Hire'}
                  </Button>
                  {canCancelJob && (
                    <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="flex-1">
                      <Ban className="w-4 h-4 mr-2" />
                      Cancel Job
                    </Button>
                  )}
                </div>
                {needsAbnForActions && (
                  <p className="text-sm text-amber-700">
                    Verify your ABN to continue.{' '}
                    <Link href={getVerifyBusinessUrl(returnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                      Verify ABN
                    </Link>
                  </p>
                )}
              </div>
            )}

            {isMyJob && job.status === 'confirmed' && (
              <div className="flex gap-3">
                {lifecycleState?.canComplete && (
                  <Button onClick={handleCompleteJob} className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Completed
                  </Button>
                )}
                {canCancelJob && (
                  <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="flex-1">
                    <Ban className="w-4 h-4 mr-2" />
                    Cancel Job
                  </Button>
                )}
              </div>
            )}

            {!isMyJob && job.status === 'confirmed' && canCancelJob && (
              <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="w-full">
                <Ban className="w-4 h-4 mr-2" />
                Cancel Job
              </Button>
            )}

            {isMyJob && job.status === 'open' && lifecycleState?.canClose && (
              <Button
                onClick={handleCloseJob}
                disabled={isClosing}
                className="
                  mt-4
                  w-full
                  border-red-200
                  bg-red-50
                  text-red-700
                  hover:bg-red-100
                  hover:border-red-300
                  hover:text-red-800
                  transition-colors
                "
              >
                {isClosing ? 'Closing…' : 'Close Job Posting'}
              </Button>
            )}

            {canLeaveReview && !existingReview && recipient && (
              <Button onClick={() => setShowReviewDialog(true)} variant="outline" className="w-full">
                <AlertCircle className="w-4 h-4 mr-2" />
                Leave Reliability Review
              </Button>
            )}

            {existingReview && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900">Review submitted and pending moderation</p>
              </div>
            )}

            {job.status === 'cancelled' && job.cancelledAt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-1">Job Cancelled</p>
                <p className="text-xs text-gray-600">
                  Cancelled on {format(job.cancelledAt, 'MMM dd, yyyy')} by{' '}
                  {job.cancelledBy === currentUser.id ? 'you' : store.getUserById(job.cancelledBy || '')?.name || 'TradeHub user'}
                </p>
                {job.cancellationReason && <p className="text-sm text-gray-700 mt-2">{job.cancellationReason}</p>}
              </div>
            )}
          </div>

          {isMyJob && applications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications ({applications.length})</h2>
              <div className="space-y-4">
                {applications.map((app) => {
                  const applicant = store.getUserById(app.subcontractorId);
                  if (!applicant) return null;

                  return (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <UserAvatar avatarUrl={applicant.avatar} userName={applicant.name || 'TradeHub user'} size="md" />
                          <div>
                            <p className="font-medium text-gray-900">{applicant.name || 'TradeHub user'}</p>
                            <p className="text-sm text-gray-600">
                              {applicant.rating} ★ · {applicant.completedJobs} jobs
                            </p>
                          </div>
                        </div>
                        {job.status === 'open' && lifecycleState?.allowsSelection && (
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSelectApplication(app.id)}
                              disabled={lifecycleState?.isExpired || needsAbnForActions || actionSubmitting}
                            >
                              Select
                            </Button>
                            {needsAbnForActions && (
                              <Link href={getVerifyBusinessUrl(returnUrl)} className="text-xs text-amber-700 font-medium">
                                Verify ABN
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                      {app.message && <p className="text-sm text-gray-700 mt-2">{app.message}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for this job</DialogTitle>
                <DialogDescription>Tell the poster why you're a great fit for this job</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="I have 10+ years of experience and can start immediately..."
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  rows={5}
                />
                <div className="flex gap-3">
                  <Button onClick={handleApply} className="flex-1">
                    Send Application
                  </Button>
                  <Button variant="outline" onClick={() => setShowApplyDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <CancelJobDialog job={job} open={showCancelDialog} onOpenChange={setShowCancelDialog} onConfirm={handleCancelJob} />

          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw Application</DialogTitle>
                <DialogDescription>
                  Are you sure you want to withdraw your application? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Optional: Reason for withdrawing (visible to the poster)"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button onClick={handleWithdrawApplication} variant="destructive" className="flex-1">
                    Confirm Withdrawal
                  </Button>
                  <Button variant="outline" onClick={() => setShowWithdrawDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Close Job Posting</DialogTitle>
                <DialogDescription>This will close the job without hiring anyone. You can reopen it later if needed.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-3">
                <Button onClick={handleCloseJob} className="flex-1">
                  Close Job
                </Button>
                <Button variant="outline" onClick={() => setShowCloseDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {recipient && (
            <ReliabilityReviewForm
              job={job}
              recipientId={recipientId!}
              recipientName={recipient.name || 'TradeHub user'}
              open={showReviewDialog}
              onOpenChange={setShowReviewDialog}
              onSubmit={handleSubmitReview}
            />
          )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
