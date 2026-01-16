'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { JobCard } from '@/components/job-card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Briefcase,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Bell,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { hasValidABN, getABNGateUrl } from '@/lib/abn-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { format, isFuture, isPast, isToday } from 'date-fns';

interface AvailabilityData {
  dates: Date[];
  description: string;
}

export default function DashboardPage() {
  const { currentUser, isLoading } = useAuth();
  const user = currentUser ?? null;

  const store = getStore();
  const router = useRouter();

  // Create supabase client once (prevents recreating client every render)
  const supabase = useMemo(() => getBrowserSupabase(), []);

  const [jobsPostedOpen, setJobsPostedOpen] = useState(false);
  const [workAvailableOpen, setWorkAvailableOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  // ✅ Redirect MUST happen in an effect, never during render
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?returnUrl=/dashboard');
    }
  }, [isLoading, user, router]);

  const myPostedJobs = useMemo(() => {
    if (!user) return [];
    return store.getJobsByContractor(user.id);
  }, [store, user]);

  const activePostedJobs = useMemo(() => {
    return myPostedJobs.filter((j) => ['open', 'accepted', 'confirmed'].includes(j.status));
  }, [myPostedJobs]);

  const myApplications = useMemo(() => {
    if (!user) return [];
    return store.applications.filter((a) => a.subcontractorId === user.id);
  }, [store, user]);

  const appliedJobs = useMemo(() => {
    return myApplications
      .map((a) => store.getJobById(a.jobId))
      .filter((j): j is NonNullable<typeof j> => j !== null && j !== undefined);
  }, [store, myApplications]);

  const availableJobs = useMemo(() => {
    if (!user) return [];

    const allOpenJobs = store.jobs.filter(
      (j) => j.status === 'open' && !myApplications.some((a) => a.jobId === j.id)
    );

    // No trade set: show all open jobs
    if (!user.primaryTrade && !user.additionalTrades?.length) return allOpenJobs;

    const userTrades = [user.primaryTrade, ...(user.additionalTrades || [])].filter(Boolean);
    return allOpenJobs.filter((job) => userTrades.includes(job.tradeCategory));
  }, [store.jobs, myApplications, user]);

  const newJobsCount = useMemo(() => {
    if (!user?.lastSeenAt) return 0;
    const lastSeen = new Date(user.lastSeenAt);
    return availableJobs.filter((job) => new Date(job.createdAt) > lastSeen).length;
  }, [availableJobs, user?.lastSeenAt]);

  const myActiveWork = useMemo(() => {
    return appliedJobs.filter((j) => ['accepted', 'confirmed'].includes(j.status));
  }, [appliedJobs]);

  const loadAvailability = useCallback(async () => {
    if (!user) return;

    setLoadingAvailability(true);
    try {
      const { data, error } = await supabase
        .from('subcontractor_availability')
        .select('date, description')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading availability:', error);
        setAvailability(null);
        return;
      }

      if (data && data.length > 0) {
        const dates = data.map((item: any) => new Date(item.date + 'T00:00:00'));
        const description = data[0]?.description || '';
        setAvailability({ dates, description });
      } else {
        setAvailability(null);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
      setAvailability(null);
    } finally {
      setLoadingAvailability(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (user) {
      loadAvailability();
    } else {
      // If logged out, keep dashboard from showing stale availability
      setAvailability(null);
      setLoadingAvailability(false);
    }
  }, [user, loadAvailability]);

  const getAvailabilityStatus = (dates: Date[]) => {
    const futureDates = dates.filter((d) => isFuture(d) || isToday(d));
    const pastDates = dates.filter((d) => isPast(d) && !isToday(d));

    if (futureDates.length > 0 && pastDates.length === 0) return 'Upcoming';
    if (futureDates.length > 0 && pastDates.length > 0) return 'Active';
    return 'Expired';
  };

  const handlePostJob = () => {
    if (!user) return;

    if (!hasValidABN(user)) {
      router.push(getABNGateUrl('/jobs/create'));
      return;
    }
    router.push('/jobs/create');
  };

  const handleSetAvailability = () => {
    router.push('/profile/availability');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  // Logged out: we already triggered redirect in useEffect
  if (!user) return null;

  return (
    <TradeGate>
      <AppLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>

            <div className="md:hidden">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSetAvailability}
                size="lg"
              >
                <Building2 className="w-4 h-4 mr-2" />
                List subcontracting availability
              </Button>
            </div>

            <div className="hidden md:flex gap-2">
              <Link href="/tenders/create">
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  List a Tender
                </Button>
              </Link>

              <Button onClick={handlePostJob}>
                <Plus className="w-4 h-4 mr-2" />
                Post a Job
              </Button>

              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSetAvailability}>
                <Building2 className="w-4 h-4 mr-2" />
                List Subcontracting Dates
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{activePostedJobs.length}</div>
                  <div className="text-sm text-gray-600">Jobs Posted</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{myActiveWork.length}</div>
                  <div className="text-sm text-gray-600">Active Work</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{availableJobs.length}</div>
                  <div className="text-sm text-gray-600">Opportunities</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{store.conversations.length}</div>
                  <div className="text-sm text-gray-600">Messages</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Mobile: Jobs posted collapsible */}
            <div className="md:hidden">
              <Collapsible open={jobsPostedOpen} onOpenChange={setJobsPostedOpen}>
                <div className="bg-white border border-gray-200 rounded-xl">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Jobs You Posted</h2>
                    {jobsPostedOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      {activePostedJobs.length > 0 ? (
                        <>
                          {activePostedJobs.slice(0, 3).map((job) => (
                            <Link key={job.id} href={`/jobs/${job.id}`}>
                              <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                <p className="font-medium text-gray-900 text-sm truncate">{job.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">{job.status}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(job.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                          <Link href="/jobs">
                            <Button variant="ghost" size="sm" className="w-full">
                              View all
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600 mb-3">No jobs posted yet</p>
                          <Button onClick={handlePostJob} variant="outline" size="sm">
                            Post a job
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Desktop: Jobs posted */}
            <div className="hidden md:block">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Jobs You Posted</h2>
                <Link href="/jobs">
                  <Button variant="ghost" size="sm">
                    View all
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {activePostedJobs.slice(0, 4).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {activePostedJobs.length === 0 && (
                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No jobs posted yet</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Post a job when you need labour or specific trades
                    </p>
                    <Button onClick={handlePostJob}>
                      <Plus className="w-4 h-4 mr-2" />
                      Post Your First Job
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Work available */}
            <div className="md:hidden">
              <Collapsible open={workAvailableOpen} onOpenChange={setWorkAvailableOpen}>
                <div className="bg-white border border-gray-200 rounded-xl">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Work Available to You</h2>
                      {newJobsCount > 0 && (
                        <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded-full">
                          <Bell className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{newJobsCount}</span>
                        </div>
                      )}
                    </div>
                    {workAvailableOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      {availableJobs.length > 0 ? (
                        <>
                          {availableJobs.slice(0, 3).map((job) => (
                            <Link key={job.id} href={`/jobs/${job.id}`}>
                              <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                <p className="font-medium text-gray-900 text-sm truncate">{job.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">{job.tradeCategory}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">{job.location}</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                          <Link href="/jobs">
                            <Button variant="ghost" size="sm" className="w-full">
                              Browse all
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600">No matching jobs right now</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Desktop: Work available */}
            <div className="hidden md:block">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Work Available to You</h2>
                <Link href="/jobs">
                  <Button variant="ghost" size="sm">
                    Browse all
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {availableJobs.slice(0, 4).map((job) => (
                  <JobCard key={job.id} job={job} showStatus={false} />
                ))}
                {availableJobs.length === 0 && (
                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No new opportunities at the moment</p>
                    <p className="text-sm text-gray-500">
                      Check back soon or browse tenders for larger projects
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Availability */}
            <div className="md:hidden">
              <Collapsible open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
                <div className="bg-white border border-gray-200 rounded-xl">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Your Subcontracting Availability</h2>
                    {availabilityOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      {loadingAvailability ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600">Loading...</p>
                        </div>
                      ) : availability && availability.dates.length > 0 ? (
                        <div className="space-y-3">
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Status</span>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  getAvailabilityStatus(availability.dates) === 'Active'
                                    ? 'bg-green-100 text-green-700'
                                    : getAvailabilityStatus(availability.dates) === 'Upcoming'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {getAvailabilityStatus(availability.dates)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium mb-1">
                              {availability.dates.length}{' '}
                              {availability.dates.length === 1 ? 'date' : 'dates'} listed
                            </p>
                            {availability.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">{availability.description}</p>
                            )}
                          </div>
                          <Button onClick={handleSetAvailability} variant="outline" size="sm" className="w-full">
                            Edit availability
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-2">No availability listed yet</p>
                          <p className="text-xs text-gray-500 mb-3">
                            List the days you are available so contractors can find and contact you
                          </p>
                          <Button onClick={handleSetAvailability} variant="outline" size="sm" className="w-full">
                            List availability
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Desktop: Availability */}
            <div className="hidden md:block">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Subcontracting Availability</h2>
              </div>

              {loadingAvailability ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-gray-600">Loading availability...</p>
                </div>
              ) : availability && availability.dates.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {availability.dates.length}{' '}
                          {availability.dates.length === 1 ? 'date' : 'dates'} listed
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            getAvailabilityStatus(availability.dates) === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : getAvailabilityStatus(availability.dates) === 'Upcoming'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {getAvailabilityStatus(availability.dates)}
                        </span>
                      </div>
                      {availability.description && <p className="text-sm text-gray-600">{availability.description}</p>}
                    </div>

                    <Button onClick={handleSetAvailability} variant="outline" size="sm">
                      Edit availability
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availability.dates.slice(0, 10).map((date, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                          isFuture(date) || isToday(date)
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {format(date, 'MMM d')}
                      </div>
                    ))}
                    {availability.dates.length > 10 && (
                      <div className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-600">
                        +{availability.dates.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No availability listed yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    List the days you are available so contractors can find and contact you
                  </p>
                  <Button onClick={handleSetAvailability}>
                    <Calendar className="w-4 h-4 mr-2" />
                    List Availability
                  </Button>
                </div>
              )}
            </div>

            {/* Active work */}
            {myActiveWork.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Your Active Work</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {myActiveWork.slice(0, 4).map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
