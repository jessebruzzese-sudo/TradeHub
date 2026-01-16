'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JobTimelineView } from '@/components/job-timeline-view';
import { AuditLogView } from '@/components/audit-log-view';
import { ArrowLeft, Lock, MapPin, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { buildJobTimeline, createAuditLog } from '@/lib/admin-utils';
import { useEffect } from 'react';

export default function AdminJobDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const store = getStore();
  const jobId = params.id as string;

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      const job = store.getJobById(jobId);
      if (job) {
        const auditLog = createAuditLog(
          currentUser.id,
          'job_viewed',
          `Admin viewed job details: ${job.title}`,
          { targetJobId: jobId }
        );
        store.addAuditLog(auditLog);
      }
    }
  }, [currentUser, jobId]);

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo={currentUser ? `/dashboard/${currentUser.role}` : '/login'} />;
  }

  const job = store.getJobById(jobId);

  if (!job) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <p className="text-gray-600">Job not found</p>
        </div>
      </AppLayout>
    );
  }

  const contractor = store.getUserById(job.contractorId);
  const applications = store.getApplicationsByJob(jobId);
  const conversation = store.conversations.find((c) => c.jobId === jobId);
  const messages = conversation ? store.getMessagesByConversation(conversation.id) : [];
  const timeline = buildJobTimeline(job, applications, messages, store.users);
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
                Posted by {contractor?.name || 'Unknown'} on {format(job.createdAt, 'MMMM dd, yyyy')}
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
                  <p className="text-sm text-gray-900 capitalize">{job.payType.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {job.location}, {job.postcode}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                ${job.rate} {job.payType === 'hourly' ? '/ hour' : job.payType === 'fixed' ? 'fixed price' : ''}
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
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Messages</p>
                <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
              </div>
              {job.selectedSubcontractor && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Selected Subcontractor</p>
                  <p className="text-sm font-medium text-gray-900">
                    {store.getUserById(job.selectedSubcontractor)?.name || 'Unknown'}
                  </p>
                </div>
              )}
              {job.status === 'cancelled' && job.cancelledBy && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cancelled By</p>
                  <p className="text-sm font-medium text-gray-900">
                    {store.getUserById(job.cancelledBy)?.name || 'Unknown'}
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
