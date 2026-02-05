'use client';

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { getStore } from '@/lib/store';
import  StatusPill  from '@/components/status-pill';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminJobsPage() {
  const { currentUser } = useAuth();
  const store = getStore();

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo={currentUser ? '/dashboard' : '/login'} />;
  }

  const jobs = store.jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Jobs (Read-Only)</h1>

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
              {jobs.map((job) => {
                const contractor = store.getUserById(job.contractorId);
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-600">{job.tradeCategory}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contractor?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill type="job" status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(job.createdAt, 'MMM dd, yyyy')}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
