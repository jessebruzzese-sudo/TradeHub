'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import StatusPill from '@/components/status-pill';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import type { JobStatus } from '@/lib/types';

type JobRow = {
  id: string;
  title: string | null;
  status: string;
  created_at: string | null;
  contractor_id: string;
  trade_category: string;
  contractor_name?: string | null;
};

export default function AdminJobsPage() {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch('/api/admin/jobs', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || data?.details || 'Failed to load jobs');
        }

        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentUser]);

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo={currentUser ? '/dashboard' : '/login'} />;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Jobs (Read-Only)</h1>

        {loading && <p className="text-gray-600">Loading jobs…</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {!loading && !error && jobs.length === 0 && (
          <p className="text-gray-600">No jobs found.</p>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Posted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{job.title || '—'}</div>
                      <div className="text-sm text-gray-600">{job.trade_category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.contractor_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill type="job" status={job.status as JobStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.created_at
                        ? format(new Date(job.created_at), 'MMM dd, yyyy')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
