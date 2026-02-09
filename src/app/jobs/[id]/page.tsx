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
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Ban,
  AlertCircle,
  Flag,
  MessageSquare,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
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
import { isAdmin } from '@/lib/is-admin';
import { ownsJob } from '@/lib/permissions';

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
  const [isLoadingJob, setIsLoadingJob] = useState(false);

  useEffect(() => {
    const fetchJobIfNeeded = async () => {
      if (!jobId || isLoadingJob) return;

      const existingJob = store.getJobById(jobId);
      if (existingJob) return;

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

          const attachments: string[] | undefined = Array.isArray(jobData.attachments)
            ? (jobData.attachments.filter((x) => typeof x === 'string') as string[])
            : undefined;

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
            attachments,
            startTime: jobData.start_time || undefined,
            selectedSubcontractor: jobData.selected_subcontractor || undefined,
            confirmedSubcontractor: jobData.confirmed_subcontractor || undefined,
          };

          store.jobs.push(job);

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
                  trades: (userData.trades as string[] | null) ?? undefined,
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

  if (isLoadingJob || !currentUser) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="text-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!job || !poster) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Job not found</h2>
            <Link href="/jobs">
              <Button variant="outline">Back to Jobs</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Trade gate (kept) — allow admin + poster to view, otherwise must match primary trade
  if (!isMyJob && !isAdminUser && job.tradeCategory !== currentUser.primaryTrade) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6">
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
              TradeHub only shows work that matches your primary trade to keep listings relevant.
            </p>
            <Link href="/jobs">
              <Button variant="outline">← Back to Jobs</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const needsAbnForActions = needsBusinessVerification(currentUser);
  const returnUrl = `/jobs/${jobId}`;

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

  const handleSelectApplication = (applicationId: string) => {
    if (needsAbnForActions) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }
    const application = store.getApplicationById(applicationId);
    if (!application) return;

    const transition = canTransitionToStatus('open', 'accepted', {
      hasSelectedSubcontractor: true,
    });

    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }

    store.updateJob(job.id, {
      status: 'accepted',
      selectedSubcontractor: application.subcontractorId,
    });
    store.updateApplication(applicationId, { status: 'selected' });
    router.refresh();
  };

  const handleAccept = () => {
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

    store.updateJob(job.id, { status: 'confirmed' });
    if (myApplication) {
      store.updateApplication(myApplication.id, { status: 'accepted', respondedAt: new Date() });
    }
    router.refresh();
  };

  const handleDecline = () => {
    const transition = canTransitionToStatus('accepted', 'open');
    if (!transition.allowed) {
      alert(transition.reason);
      return;
    }

    store.updateJob(job.id, { status: 'open', selectedSubcontractor: undefined });
    if (myApplication) {
      store.updateApplication(myApplication.id, { status: 'declined', respondedAt: new Date() });
    }
    router.refresh();
  };

  const handleConfirmHire = () => {
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

    store.updateJob(job.id, { status: 'confirmed', confirmedSubcontractor: job.selectedSubcontractor });
    const selectedApp = applications.find((a) => a.subcontractorId === job.selectedSubcontractor);
    if (selectedApp) {
      store.updateApplication(selectedApp.id, { status: 'confirmed' });
    }
    router.refresh();
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

  const handleCloseJob = () => {
    if (!lifecycleState?.canClose) {
      alert('Cannot close job at this time');
      return;
    }

    store.updateJob(job.id, { status: 'closed' });
    setShowCloseDialog(false);
    router.refresh();
  };

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

    const conversation = store.conversations.find(
      (c) =>
        c.jobId === job.id &&
        (c.contractorId === currentUser.id || c.subcontractorId === currentUser.id)
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

    const conversation = store.conversations.find(
      (c) =>
        c.jobId === job.id &&
        (c.contractorId === currentUser.id || c.subcontractorId === currentUser.id)
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

  const handleSubmitReview = (review: any) => {
    store.createReview({
      ...review,
      id: `review-${Date.now()}`,
      authorId: currentUser.id,
      createdAt: new Date(),
    });
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
      <div className="max-w-4xl mx-auto p-4 md:p-6">
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

          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
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
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>
                  {job.location}, {job.postcode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>{job.dates.map((d) => format(d, 'dd MMM yyyy')).join(', ')}</span>
              </div>
              {job.startTime && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span>{job.startTime}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span>
                  ${job.rate} {job.payType === 'hourly' ? 'per hour' : 'fixed price'}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Posted by</h3>
              <Link href={`/users/${poster.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                  <UserAvatar avatarUrl={poster.avatar} userName={poster.name} size="md" />
                  <div>
                    <p className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{poster.name}</p>
                    <p className="text-sm text-gray-600">{poster.businessName}</p>
                  </div>
                </div>
              </Link>
            </div>

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
                  <Button onClick={handleAccept} className="flex-1" disabled={needsAbnForActions}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                  <Button onClick={handleDecline} variant="outline" className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
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
                    disabled={!lifecycleState?.canConfirmHire || needsAbnForActions}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Hire
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
              <Button onClick={() => setShowCloseDialog(true)} variant="outline" className="w-full">
                Close Job Posting
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
                  {job.cancelledBy === currentUser.id ? 'you' : store.getUserById(job.cancelledBy || '')?.name}
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
                          <UserAvatar avatarUrl={applicant.avatar} userName={applicant.name} size="md" />
                          <div>
                            <p className="font-medium text-gray-900">{applicant.name}</p>
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
                              disabled={lifecycleState?.isExpired || needsAbnForActions}
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
              recipientName={recipient.name}
              open={showReviewDialog}
              onOpenChange={setShowReviewDialog}
              onSubmit={handleSubmitReview}
            />
          )}
        </div>
      </AppLayout>
  );
}
