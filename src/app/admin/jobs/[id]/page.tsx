'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { getStore } from '@/lib/store';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JobTimelineView } from '@/components/job-timeline-view';
import { AuditLogView } from '@/components/audit-log-view';
import { ArrowLeft, Lock, MapPin, Calendar, DollarSign } from 'lucide-react';
import { buildJobTimeline, createAuditLog } from '@/lib/admin-utils';
import { formatJobPayTypeLabel, formatJobPriceDisplay } from '@/lib/job-pay-labels';
import type { Job, JobStatus, PayType, User } from '@/lib/types';

type AdminJobApiRow = {
  id: string;
  contractor_id: string;
  title: string;
  description: string;
  trade_category: string;
  location: string;
  postcode: string;
  dates: unknown;
  start_time?: string | null;
  duration?: number | null;
  pay_type: string;
  rate?: number | null;
  status: string;
  selected_subcontractor?: string | null;
  confirmed_subcontractor?: string | null;
  created_at: string | null;
  start_date?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  was_accepted_or_confirmed_before_cancellation?: boolean | null;
  starts_at?: string | null;
  fulfilled?: boolean | null;
  fulfillment_marked_by?: string | null;
  fulfillment_marked_at?: string | null;
  reminder_48h_sent?: boolean | null;
  contractor_name?: string | null;
  selected_subcontractor_name?: string | null;
  confirmed_subcontractor_name?: string | null;
  cancelled_by_name?: string | null;
};

function parseJobDates(raw: unknown): Date[] {
  if (!Array.isArray(raw)) return [];
  const out: Date[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const d = new Date(item);
      if (!Number.isNaN(d.getTime())) out.push(d);
    }
  }
  return out;
}

function apiJobToAppJob(row: AdminJobApiRow): Job {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    title: row.title,
    description: row.description,
    tradeCategory: row.trade_category,
    location: row.location,
    postcode: row.postcode,
    dates: parseJobDates(row.dates),
    startTime: row.start_time ?? undefined,
    duration: row.duration ?? undefined,
    payType: row.pay_type as PayType,
    rate: row.rate ?? 0,
    status: row.status as JobStatus,
    selectedSubcontractor: row.selected_subcontractor ?? undefined,
    confirmedSubcontractor: row.confirmed_subcontractor ?? undefined,
    createdAt: new Date(row.created_at ?? Date.now()),
    startDate: row.start_date ? new Date(row.start_date) : undefined,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    wasAcceptedOrConfirmedBeforeCancellation:
      row.was_accepted_or_confirmed_before_cancellation ?? undefined,
    startsAt: row.starts_at ? new Date(row.starts_at) : undefined,
    fulfilled: row.fulfilled ?? undefined,
    fulfillmentMarkedBy: row.fulfillment_marked_by ?? undefined,
    fulfillmentMarkedAt: row.fulfillment_marked_at
      ? new Date(row.fulfillment_marked_at)
      : undefined,
    reminder48hSent: row.reminder_48h_sent ?? undefined,
  };
}

/** Minimal user list so timeline can resolve contractor / sub names from API. */
function namesToUsers(row: AdminJobApiRow): User[] {
  const users: User[] = [];
  if (row.contractor_id && row.contractor_name) {
    users.push({
      id: row.contractor_id,
      name: row.contractor_name,
      email: '',
      role: 'contractor',
      trustStatus: 'approved',
      rating: 0,
      completedJobs: 0,
      memberSince: new Date(),
      createdAt: new Date(),
    });
  }
  if (row.selected_subcontractor && row.selected_subcontractor_name) {
    users.push({
      id: row.selected_subcontractor,
      name: row.selected_subcontractor_name,
      email: '',
      role: 'subcontractor',
      trustStatus: 'approved',
      rating: 0,
      completedJobs: 0,
      memberSince: new Date(),
      createdAt: new Date(),
    });
  }
  if (row.confirmed_subcontractor && row.confirmed_subcontractor_name) {
    users.push({
      id: row.confirmed_subcontractor,
      name: row.confirmed_subcontractor_name,
      email: '',
      role: 'subcontractor',
      trustStatus: 'approved',
      rating: 0,
      completedJobs: 0,
      memberSince: new Date(),
      createdAt: new Date(),
    });
  }
  if (row.cancelled_by && row.cancelled_by_name) {
    users.push({
      id: row.cancelled_by,
      name: row.cancelled_by_name,
      email: '',
      role: 'contractor',
      trustStatus: 'approved',
      rating: 0,
      completedJobs: 0,
      memberSince: new Date(),
      createdAt: new Date(),
    });
  }
  return users;
}

export default function AdminJobDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const store = getStore();
  const jobId = params.id as string;

  const [apiRow, setApiRow] = useState<AdminJobApiRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser) || !jobId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          job?: AdminJobApiRow;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || 'Failed to load job');
          setApiRow(null);
          return;
        }

        if (!data.job) {
          setError('JOB_NOT_FOUND');
          setApiRow(null);
          return;
        }

        setApiRow(data.job);
        setError(null);
      } catch {
        if (!cancelled) setError('Failed to load job');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, jobId]);

  const job = apiRow ? apiJobToAppJob(apiRow) : null;
  const timelineUsers = apiRow ? namesToUsers(apiRow) : [];

  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser) || !job) return;
    const auditLog = createAuditLog(
      currentUser.id,
      'job_viewed',
      `Admin viewed job details: ${job.title}`,
      { targetJobId: jobId }
    );
    store.addAuditLog(auditLog);
  }, [currentUser, job, jobId, store]);

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo={currentUser ? '/dashboard' : '/login'} />;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <p className="text-gray-600">Loading job…</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !job || !apiRow) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Link href="/admin/jobs">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <p className="text-gray-600">{error === 'JOB_NOT_FOUND' ? 'Job not found' : error || 'Job not found'}</p>
        </div>
      </AppLayout>
    );
  }

  const contractorName = apiRow.contractor_name || 'Unknown';
  const timeline = buildJobTimeline(job, [], [], timelineUsers);
  const auditLogs = store.getAuditLogsByJob(jobId);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <Link href="/admin/jobs">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>

          <Alert className="bg-blue-50 border-blue-200 mb-4">
            <Lock className="w-4 h-4 text-blue-600" />
            <AlertDescription className="ml-2 text-sm text-blue-800">
              This is a read-only view for admin purposes. You cannot post jobs, apply, or participate in messaging.
            </AlertDescription>
          </Alert>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Posted by {contractorName} on {format(job.createdAt, 'MMMM dd, yyyy')}
              </p>
            </div>
            <StatusPill type="job" status={job.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Job Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Trade Category</p>
                  <p className="text-sm text-gray-900">{job.tradeCategory}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Pay Type</p>
                  <p className="text-sm text-gray-900">{formatJobPayTypeLabel(job.payType)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {job.location}, {job.postcode}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                {formatJobPriceDisplay(job, 'long')}
              </div>
              {job.dates && job.dates.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Dates Required</p>
                  <div className="flex flex-wrap gap-2">
                    {job.dates.map((date, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                      >
                        <Calendar className="w-3 h-3" />
                        {format(date, 'MMM dd, yyyy')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Job Statistics</h3>
            <p className="text-xs text-gray-500 mb-3">
              Application and message counts are not loaded in this DB-only admin view.
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Applications</p>
                <p className="text-2xl font-bold text-gray-400">—</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Messages</p>
                <p className="text-2xl font-bold text-gray-400">—</p>
              </div>
              {job.selectedSubcontractor && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Selected Subcontractor</p>
                  <p className="text-sm font-medium text-gray-900">
                    {apiRow.selected_subcontractor_name || 'Unknown'}
                  </p>
                </div>
              )}
              {job.status === 'cancelled' && job.cancelledBy && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cancelled By</p>
                  <p className="text-sm font-medium text-gray-900">
                    {apiRow.cancelled_by_name || 'Unknown'}
                  </p>
                  {job.cancellationReason && (
                    <p className="text-xs text-gray-600 mt-1">{job.cancellationReason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <JobTimelineView timeline={timeline} />
        </div>

        {auditLogs.length > 0 && (
          <AuditLogView
            logs={auditLogs}
            users={store.users}
            title="Admin Actions for This Job"
            emptyMessage="No admin actions recorded"
          />
        )}
      </div>
    </AppLayout>
  );
}
