'use client';

/*
 * QA notes - ABN gating (Job edit):
 * - /jobs/[id]/edit redirects unverified users to /verify-business (returnUrl preserved). No TradeGate.
 * - Edit job is a commit action; only verified ABN users can save changes.
 */

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { ownsJob, canEditJob } from '@/lib/permissions';
import { needsBusinessVerification, redirectToVerifyBusiness } from '@/lib/verification-guard';
import { safeRouterPush } from '@/lib/safe-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function EditJobPage() {
  const { session, currentUser, isLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const store = getStore();
  const jobId = params.id as string;

  const job = store.getJobById(jobId);

  const [formData, setFormData] = useState({
    title: '',
    tradeCategory: '',
    location: '',
    postcode: '',
    startTime: '08:00',
    duration: '1',
    payType: 'fixed',
    rate: '',
    description: '',
  });
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [multipleDates, setMultipleDates] = useState(false);

  const hasRedirectedAbn = useRef(false);
  const hydratedRef = useRef(false);

  // Hydrate form when job becomes available (handles async store population).
  useEffect(() => {
    if (!job || hydratedRef.current) return;
    hydratedRef.current = true;
    setFormData({
      title: job.title || '',
      tradeCategory: job.tradeCategory || currentUser?.primaryTrade || '',
      location: job.location || '',
      postcode: job.postcode || '',
      startTime: job.startTime || '08:00',
      duration: job.duration?.toString() || '1',
      payType: job.payType || 'fixed',
      rate: job.rate?.toString() || '',
      description: job.description || '',
    });
    const firstDate = job.dates?.[0];
    setSingleDate(firstDate ? (firstDate instanceof Date ? firstDate : new Date(firstDate)) : undefined);
  }, [job, currentUser?.primaryTrade]);

  // Redirect only after profile has loaded (avoid redirect loops / gating during load).
  useEffect(() => {
    if (isLoading) return;
    if (!job) {
      safeRouterPush(router, '/jobs', '/jobs');
      return;
    }
    if (!currentUser) return;
    if (!ownsJob(currentUser, job)) {
      safeRouterPush(router, `/jobs/${jobId}`, '/jobs');
      return;
    }
  }, [isLoading, job, currentUser, jobId, router]);

  useEffect(() => {
    if (isLoading || hasRedirectedAbn.current) return;
    if (!currentUser || !job || !ownsJob(currentUser, job)) return;
    if (needsBusinessVerification(currentUser)) {
      hasRedirectedAbn.current = true;
      redirectToVerifyBusiness(router, `/jobs/${jobId}/edit`);
    }
  }, [isLoading, currentUser, job, jobId, router]);

  if (!session?.user) return null;

  const isOwner = job && currentUser && ownsJob(currentUser, job);
  const isRedirecting =
    !job || (currentUser && job && !ownsJob(currentUser, job)) || (job && currentUser && isOwner && needsBusinessVerification(currentUser));

  if (isLoading || (session?.user && !currentUser) || isRedirecting) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-4xl items-center justify-center p-8">
          <p className="text-sm text-gray-500">{isRedirecting ? 'Redirecting…' : 'Loading...'}</p>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !job || !canEditJob(currentUser, job)) {
      if (currentUser && job && ownsJob(currentUser, job) && needsBusinessVerification(currentUser)) {
        toast.error('Verify your ABN to continue.');
        redirectToVerifyBusiness(router, `/jobs/${jobId}/edit`);
      }
      return;
    }

    let jobDates: Date[];
    let duration: number;

    if (multipleDates) {
      if (!dateFrom || !dateTo) {
        toast.error('Please select both start and end dates');
        return;
      }
      if (dateTo < dateFrom) {
        toast.error('End date cannot be earlier than start date');
        return;
      }
      jobDates = [dateFrom];
      const diffTime = Math.abs(dateTo.getTime() - dateFrom.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else {
      if (!singleDate) {
        toast.error('Please select a date');
        return;
      }
      jobDates = [singleDate];
      duration = parseInt(formData.duration, 10) || 1;
    }

    store.updateJob(jobId, {
      title: formData.title,
      description: formData.description,
      tradeCategory: formData.tradeCategory,
      location: formData.location,
      postcode: formData.postcode,
      dates: jobDates,
      startTime: formData.startTime,
      duration,
      payType: formData.payType as 'fixed' | 'hourly',
      rate: parseFloat(formData.rate),
    });

    toast.success('Job updated successfully');
    safeRouterPush(router, `/jobs/${jobId}`, '/jobs');
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <PageHeader backLink={{ href: `/jobs/${jobId}` }} title="Edit Job" />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Electrical Rewire - Kitchen & Living Room"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tradeCategory">Trade Category</Label>
              <Input
                id="tradeCategory"
                type="text"
                value={currentUser!.primaryTrade ?? ''}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-set from your primary trade.{' '}
                <Link href="/pricing" className="font-medium text-blue-600 hover:text-blue-700">
                  Add extra trades
                </Link>
                <span className="text-gray-400"> (Premium)</span>
              </p>
            </div>

            <SuburbAutocomplete
              value={formData.location}
              postcode={formData.postcode}
              onSuburbChange={(value) => handleChange('location', value)}
              onPostcodeChange={(value) => handleChange('postcode', value)}
              required
            />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label>Date</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="multipleDates" className="cursor-pointer text-sm font-normal text-gray-600">
                    Multiple dates
                  </Label>
                  <Switch id="multipleDates" checked={multipleDates} onCheckedChange={setMultipleDates} />
                </div>
              </div>

              {!multipleDates ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`mt-1 w-full justify-start text-left font-normal ${!singleDate ? 'text-gray-500' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {singleDate ? formatDate(singleDate, 'dd/MM/yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={singleDate}
                          onSelect={setSingleDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => handleChange('startTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      required
                      value={formData.duration}
                      onChange={(e) => handleChange('duration', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="dateFrom">Date from</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`mt-1 w-full justify-start text-left font-normal ${!dateFrom ? 'text-gray-500' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? formatDate(dateFrom, 'dd/MM/yyyy') : 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Date to</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`mt-1 w-full justify-start text-left font-normal ${!dateTo ? 'text-gray-500' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? formatDate(dateTo, 'dd/MM/yyyy') : 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          disabled={(date) => (dateFrom ? date < dateFrom : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="startTimeMulti">Start Time</Label>
                    <Input
                      id="startTimeMulti"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => handleChange('startTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              {multipleDates && dateFrom && dateTo && (
                <p className="mt-2 text-xs text-gray-500">
                  Duration: {Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="payType">Pay Type</Label>
                <Select value={formData.payType} onValueChange={(value) => handleChange('payType', value)} required>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Asking price</SelectItem>
                    <SelectItem value="hourly">Offering hourly rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rate">
                  {formData.payType === 'hourly' ? 'Hourly Rate ($)' : 'Asking Price ($)'}
                </Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  placeholder={formData.payType === 'hourly' ? 'e.g. $60' : 'e.g. 2400'}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide details about the job, requirements, and any special instructions..."
                rows={6}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
              <Link href={`/jobs/${jobId}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
