// @ts-nocheck
// vim: ts=2
'use client';

/*
 * QA notes — Job detail:
 * - Browse and view always allowed. Posting/editing job listings requires contractor role (RLS); ABN not required for those.
 * - Apply, select applicant, confirm hire, etc. still require verified ABN — copy and toasts say so clearly.
 */

export const dynamic = "force-dynamic";

import { getAxios, getUserRating } from "@/lib/utils";
import { AppLayout } from '@/components/app-nav';
import { UnauthorizedAccess } from "@/components/unauthorized-access";
import { useAuth } from '@/lib/auth';
import type { PayType, JobStatus } from '@/lib/types';
import { loadJobById, syncContractorIntoStore } from '@/lib/jobs/load-job-by-id';
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
import UserContext from "@/lib/user-context";
import { useContext, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CancelJobDialog } from '@/components/cancel-job-dialog';
import { ReliabilityReviewForm } from '@/components/reliability-review-form';
import { JobStatusMessage } from '@/components/job-status-message';
import { canLeaveReliabilityReview } from '@/lib/cancellation-utils';
import { hasPremiumAccess } from '@/lib/billing/has-premium-access';
import { getJobLifecycleState, canWithdrawApplication, canTransitionToStatus } from '@/lib/job-lifecycle';
import { createSystemMessage, shouldAddSystemMessage } from '@/lib/messaging-utils';
import { needsBusinessVerification, redirectToVerifyBusiness, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { hasValidABN } from '@/lib/abn-utils';
import { canEditJob } from '@/lib/permissions';
import { JOB_EDIT_CONTRACTOR_ROLE_MESSAGE } from '@/lib/jobs/job-post-role-messages';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';
import { getPublicProfileHref } from '@/lib/url-utils';
import { debugProfileCardData } from '@/lib/profile-debug';

function AttachmentRow({
  attachment,
  onImageClick,
}: {
  attachment: any;
  onImageClick?: (img: { url: string; name: string }) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!attachment) return;
      setUrl(attachment?.url ?? null);
    }
    run();
    return () => {
      alive = false;
    };
  }, [attachment]);

  const name = attachment?.fileName ?? null;
  const type = attachment?.mime ?? null;
	const size = attachment?.size ?? null;
  const ext = (name.split('.').pop() || '').toLowerCase();
  const isImage = (type && type.startsWith('image/'));
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

  const { jwt } = useAuth();
	const UserSession = useContext(UserContext);
  const params = useParams();
  const router = useRouter();
  const jobId = useMemo(() => {
    const raw = params?.id;
    if (typeof raw === 'string') return raw.trim();
    if (Array.isArray(raw) && raw[0] != null) return String(raw[0]).trim();
    return '';
  }, [params?.id]);
	
	const [currentUser, setCurrentUser] = useState(UserSession?.user ?? null);
	const [job, setJob] = useState(null);
	const [applications, setApplications] = useState(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxItems, setLightboxItems] = useState([]);

	const isLoadingJob = job === null;
	const hasSession = jwt !== undefined && jwt !== null;

  useEffect(() => {
		if(job !== null){
			return;
		}
		getAxios(null).get(`/api/jobs/${jobId}`).
			then((response_)=>{
				const data = response_.data;
				setJob(data);
			}).catch((err_)=>{
				console.error(err_);
				toast.error("Could not load job");
			});
  }, [job]);
	
	useEffect(()=>{
		if(applications !== null){
			return;
		}	
		getAxios(null).get(`/api/jobs/${jobId}/applications`).
			then((response_)=>{
				const data = response_.data;
				setApplications(data);
			}).catch((error_)=>{
				console.error(error_);
				toast.error("Could not load applications");
			});
	}, [applications]);

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

  const poster = job?.owner ?? null;
  const posterPremium = poster?.premium ?? false;
	const viewerPremium = currentUser?.profile?.premium ?? false;

  // “My application” = any application made by the current user (single-account model)
  const myApplication = applications?.find((a) => a?.applicant?.userId === currentUser?.id) ?? null;
	const myAppStatus = myApplication?.status ?? null;
  const isAdminUser = currentUser?.role === "admin";
  const isMyJob = job && currentUser && job.owner.id === currentUser.id;
	const applicationCount = applications?.length ?? 0;
  const lifecycleState = job ? getJobLifecycleState(job, applicationCount > 0) : null;

  // In single-account model: anyone who is NOT the job owner can apply (unless admin overrides are supported elsewhere)
  const canApply = currentUser && job && !isMyJob && lifecycleState?.allowsApplications && !myApplication;

  // Anyone (who is not job owner) can message poster as long as job isn’t closed/cancelled
  const canMessage = currentUser && job && !isMyJob && job.status !== 'cancelled' && job.status !== 'closed';

  const canWithdraw = myApplication
    ? canWithdrawApplication(myApplication.status, job?.status || 'open')
    : false;

  const viewerTrades = useMemo(() => {
		if(currentUser === null){
			return;
		}
    const t = currentUser?.business?.trades;
    if (Array.isArray(t) && t.length > 0) {
      return t.map((x: string) => x.trim());
    }
    const pt = currentUser?.business?.primaryTrade;
    return [pt];
  }, [currentUser]);
		
	if(!hasSession){
		return <UnauthorizedAccess message={"Logging out..."} redirectTo={"/login"} />;
	}

  if (isLoadingJob) {
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

  if (!job) {
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
	const jobTradeCat = job?.tradeCategory ?? null;
  const jobTradeMatchesViewer = viewerTrades.length > 0 && viewerTrades.includes(jobTradeCat);
  if (!isMyJob && !isAdminUser && !jobTradeMatchesViewer && !viewerPremium) {
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
  const abnRequiredActionToast =
    "This step requires a verified ABN. Verify your business to continue.";
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
      toast.error(abnRequiredActionToast);
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    setShowApplyDialog(true);
  };

  const handleApply = () => {
    if (needsAbnForActions) {
      toast.error(abnRequiredActionToast);
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    const payload = {
      jobId: job.id,
      message: applicationMessage
    };
		getAxios(null).post("/api/me/applications", payload).
			then((response_)=>{
				toast.success("Application submitted");
    		setShowApplyDialog(false);
    		setApplicationMessage("");
			}).catch((error_)=>{
				toast.error("Could not submit application, try again later");
    		setShowApplyDialog(false);
    		setApplicationMessage("");
			});
  };

  const handleSelectApplication = async (applicationId: string) => {
    if (needsAbnForActions) {
      toast.error(abnRequiredActionToast);
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    setActionSubmitting(true);
		const payload = {
			action: "select",
			applicationId
		};	
		getAxios(null).post(`/api/jobs/${jobId}/action`, payload).
			then((response_)=>{
      	toast.success('Application selected');
      	setActionSubmitting(false);
				setApplications(null);
			}).catch((error_)=>{
      	toast.error("Could not select application");
      	setActionSubmitting(false);
			});
  };

  const handleAccept = async () => {
    if (needsAbnForActions) {
      toast.error(abnRequiredActionToast);
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    setActionSubmitting(true);
		getAxios(null).put(`/api/jobs/${jobId}/applications/${myApplication.id}/accept`).
			then((response_)=>{
				toast.success("Job accepted");
				setApplications(null);
			}).catch((err_)=>{
				toast.error("Could not accept application");
			}).finally(()=>{
    		setActionSubmitting(false);
			});
  };

  const handleDecline = async () => {
    setActionSubmitting(true);
		getAxios(null).put(`/api/jobs/${jobId}/applications/${myApplication.id}/decline`).
			then((response_)=>{
				toast.success("Job declined");
				setApplications(null);
			}).catch((err_)=>{
				toast.error("Could not decline application");
			}).finally(()=>{
    		setActionSubmitting(false);
			});
  };

  const handleConfirmApplication = async (appId:string) => {
    if (needsAbnForActions) {
      toast.error(abnRequiredActionToast);
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    setActionSubmitting(true);
		getAxios(null).post(`/api/jobs/${jobId}/action`, { action: "confirm", applicationId: appId }).
			then((response_)=>{
      	toast.success("Hire confirmed");
    		setActionSubmitting(false);
				setJob(null);
				setApplications(null);
			}).catch((error_)=>{
				toast.error("Could not confirm job");
    		setActionSubmitting(false);
			});
  };

  const handleWithdrawApplication = () => {
    if (!myApplication) return;
		const payload = { reason: withdrawReason };
		getAxios(null).put(`/api/jobs/${jobId}/applications/${myApplication.id}/withdraw`, payload).
			then((response_)=>{
				toast.success("Application withdrawn");
				setApplications(null);
			}).catch((err_)=>{
				toast.error("Could not withdraw application");
			}).finally(()=>{
    		setShowWithdrawDialog(false);
    		setWithdrawReason("");
    		router.refresh();
			});
	}

  async function handleCloseJob() {
    if (!currentUser?.id) {
      toast.error('You must be logged in.');
      return;
    }
    if (!job) return;
    setIsClosing(true);
		getAxios(null).put(`/api/jobs/${jobId}`, {status: "closed"}).
			then((response_)=>{
      	toast.success("Job closed successfully");
    		setIsClosing(false);
				setJob(null);
			}).catch((error_)=>{
      	toast.success("Could not close job");
    		setIsClosing(false);
			});
  }

  const handleCompleteJob = () => {
		// mark job as completed
		// mark application as completed
		getAxios(null).put(`/api/jobs/${jobId}/complete`).
			then((response_)=>{
				toast.success("Job completed");
				setJob(null);
				setApplications(null);
			}).catch((err_)=>{
				toast.error("Could not complete job");
			}).finally(()=>{
			});
  };

  const handleCancelJob = (reason: string) => {
		const app = applications.find((x)=>x.status === "confirmed");
		const wasConfirmed = app !== undefined;
		const payload = {
			reason,
			cancelledBy: currentUser.id,
			wasConfirmed
		};
		getAxios(null).put(`/api/jobs/${jobId}/cancel`, payload).
			then((response_)=>{
				toast.success("Job cancelled");
				setJob(null);
			}).catch((err_)=>{
				toast.error("Could not cancel job");
			}).finally(()=>{
			});
  };

  const handleSubmitReview = async (review: any) => {
		toast.info("coming soon");
  };

  const handleMessagePoster = () => {
		const posterId = job?.owner?.profileId ?? null;
		getAxios(null).post(`/api/conversations`, {otherProfileId: posterId}).
			then((response_)=>{
    		router.push(`/messages?otherProfileId=${posterId}`);
			}).catch((err_)=>{
				toast.error("Could not create conversation");			
			});
  };

  const canCancelJob = isMyJob && job.status !== "completed";
  const canLeaveReview = job.status === "cancelled";
  const existingReview = canLeaveReview ? null : null;
  let recipientId = null;
	if(isMyJob && applications !== null){
		const app = applications.find((x)=>x.status === "confirmed");
		recipientId = app?.profileId ?? null; 
	}else{
		recipientId = myAppStatus === "confirmed" ? job.owner.profileId : null;
	}

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

              {(() => {
                debugProfileCardData('jobs-posted-by', {
                  id: poster?.id ?? job.contractorId,
                  user_id: (poster as { user_id?: string } | null)?.user_id,
                  contractorId: job.contractorId,
                });
                return null;
              })()}
					
							{/* Note that poster.id is owner.id, which is user id and not profile id */}
              <Link
                href={getPublicProfileHref(poster.id)}
                className="block group"
              >
                <div
                  className={[
                    'relative flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all duration-200',
                    'hover:bg-slate-50 hover:border-slate-200',
                    // Premium glow (canonical billing)
                    posterPremium
                      ? 'ring-2 ring-amber-300/50 shadow-[0_0_0_6px_rgba(251,191,36,0.08)]'
                      : 'border-slate-200'
                  ].join(' ')}
                >
                  {/* Premium badge (top right) */}
                  {posterPremium && (
                    <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                      <Crown className="h-3.5 w-3.5 text-amber-700" />
                      Premium
                    </div>
                  )}

                  {/* Avatar (larger) */}
                  <UserAvatar
                    avatarUrl={`/api/profile/${poster?.profileId}/avatar`}
                    userName={poster?.name || 'TradeHub user'}
                    size="xl"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {poster?.name || 'TradeHub user'}
                      </p>

                      {/* Verified badge */}
                      {poster && poster.abnVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          <BadgeCheck className="h-3.5 w-3.5 text-blue-600" />
                          Verified
                        </span>
                      )}
                    </div>

										{/* TODO confirm business name here */}
                    {poster?.businessName && (
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {poster.businessName}
                      </p>
                    )}

                    {poster && poster?.rating && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-slate-700">
                          {Number(poster?.rating).toFixed(1)}
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
                {isMyJob && job.status === 'open' && canEditJob(currentUser, job) && (
                  <Link href={`/jobs/${job.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Post
                    </Button>
                  </Link>
                )}
                {isMyJob && job.status === 'open' && !canEditJob(currentUser, job) && (
                  <span
                    className="max-w-[11rem] text-right text-xs text-amber-800 sm:max-w-xs"
                    title={JOB_EDIT_CONTRACTOR_ROLE_MESSAGE}
                  >
                    Editing requires a contractor account.
                  </span>
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

            {currentUser && (
              <p className="mb-4 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Heads up:</span> Posting a job does not require ABN
                verification. Applying, selecting a subcontractor, and confirming hire require a verified ABN when you take
                those steps.
              </p>
            )}

            {canApply && (
              <div className="space-y-3">
                {needsAbnForActions ? (
                  <div className="space-y-2">
                    <Button
                      disabled
                      className="w-full"
                      title="Applying requires a verified ABN. Posting a job does not."
                    >
                      Apply for this Job
                    </Button>
                    <p className="text-sm text-amber-700">
                      Applying requires a verified ABN.{' '}
                      <Link href={getVerifyBusinessUrl(returnUrl)} className="font-medium text-blue-600 hover:text-blue-700 underline">
                        Verify business
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
            { !isMyJob && job.status === "open" && myAppStatus === "selected" && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Button
                    onClick={handleAccept}
                    className="flex-1"
                    disabled={needsAbnForActions || actionSubmitting}
                    title={needsAbnForActions ? "Accepting requires a verified ABN." : ""}
                  >
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
                    This step requires a verified ABN.
                    <Link href={getVerifyBusinessUrl(returnUrl)} 
												className="font-medium text-blue-600 hover:text-blue-700 underline">
                      Verify business
                    </Link>
                  </p>
                )}
              </div>
            )}
            {isMyJob && job.status === 'confirmed' && (
              <div className="flex gap-3">
              	<Button onClick={handleCompleteJob} className="flex-1">
									<CheckCircle className="w-4 h-4 mr-2" />
									Mark as Completed
								</Button>
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

            {canLeaveReview && !existingReview && recipientId && (
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
          { isMyJob && applications !== null && applications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications ({applications.length})</h2>
              <div className="space-y-4">
                {applications.map((app) => {
                  const applicant = app?.applicant ?? null;
                  if (!applicant) 
										return null;
									const selectButton = (
										<Button
											size="sm"
											onClick={() => handleSelectApplication(app.id)}
											disabled={ needsAbnForActions || actionSubmitting || app.status !== "applied" }
											title={ needsAbnForActions 
												? "Selecting a subcontractor requires a verified ABN (posting this job did not)."
												: "Shortlist this applicant for hiring" }>
											Select
										</Button>
									);
									const confirmButton = (
										<Button
											size="sm"
											onClick={() => handleConfirmApplication(app.id)}
											disabled={ needsAbnForActions || actionSubmitting || app.status !== "accepted" }
											title={ needsAbnForActions 
												? "Confirming a subcontractor requires a verified ABN (posting this job did not)."
												: "Confirm this applicant for hiring"}>
											Confirm
										</Button>
									);
                  return (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <UserAvatar avatarUrl={applicant.avatarDataUrl} 
														userName={applicant.name || 'TradeHub user'} 
														size="md" />
                          <div>
                            <p className="font-medium text-gray-900">{applicant.name || 'TradeHub user'}</p>
                            <p className="text-sm text-gray-600">
                              {getUserRating(applicant.upVotes, applicant.downVotes)}&nbsp;★ 
															·&nbsp;
															{applicant.completedJobs}&nbsp;job(s)
															·&nbsp;
                							<StatusPill type="application" status={app.status} />
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                        { job.status === 'open' && selectButton }
                        { job.status === 'open' && confirmButton }
												{ needsAbnForActions && (
													<Link href={getVerifyBusinessUrl(returnUrl)} className="text-xs text-amber-700 font-medium">
														Verify business
													</Link>
												)}
                        </div>
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
                  placeholder="Please enter your application here..."
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

          {recipientId && (
            <ReliabilityReviewForm
              job={job}
              recipientId={recipientId!}
              recipientName={"TradeHub user"}
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
