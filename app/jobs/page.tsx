'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { JobCard } from '@/components/job-card';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { buildLoginUrl } from '@/lib/url-utils';

export default function JobsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const store = getStore();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!currentUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(buildLoginUrl('/jobs'));
    } else if (currentUser?.role === 'admin' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/admin');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role === 'admin') {
    return null;
  }

  if (currentUser.role === 'contractor') {
    const myJobs = store.getJobsByContractor(currentUser.id);

    return (
      <TradeGate>
        <AppLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
              <p className="text-gray-600">Manage your job postings</p>
            </div>
            <Link href="/jobs/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Post Job
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {myJobs.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs posted yet</h3>
              <p className="text-gray-600 mb-6">Create your first job posting to find subcontractors</p>
              <Link href="/jobs/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </Link>
            </div>
          )}
        </div>
      </AppLayout>
      </TradeGate>
    );
  }

  const myApplications = store.applications.filter((a) => a.subcontractorId === currentUser.id);
  const appliedJobs = myApplications
    .map((a) => store.getJobById(a.jobId))
    .filter((job) => job !== undefined && job.tradeCategory === currentUser.primaryTrade);
  const availableJobs = store.jobs.filter(
    (j) => j.status === 'open' &&
    !myApplications.some((a) => a.jobId === j.id) &&
    j.tradeCategory === currentUser.primaryTrade &&
    j.contractorId !== currentUser.id
  );

  return (
    <TradeGate>
      <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Jobs</h1>

        <div className="space-y-3">
          {availableJobs.map((job) => (
            <JobCard key={job.id} job={job} showStatus={false} />
          ))}
        </div>

        {availableJobs.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs available</h3>
            <p className="text-gray-600">Check back soon for new opportunities in your trade</p>
          </div>
        )}
      </div>
    </AppLayout>
    </TradeGate>
  );
}
