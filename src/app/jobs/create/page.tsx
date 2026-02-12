'use client';

/*
 * QA notes - ABN gating (Jobs create):
 * - /jobs/create redirects unverified users to /verify-business (returnUrl=/jobs/create); no form flash.
 * - Verified users can create jobs as normal.
 * - No TradeGate; ABN gates the route (action), not browsing.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon, Upload, X, FileText, Info } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { PremiumJobUpsellModal } from '@/components/premium-job-upsell-modal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';

import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { getABNStatusMessage, hasABNButNotVerified } from '@/lib/abn-utils';
import { safeRouterPush } from '@/lib/safe-nav';
import { needsBusinessVerification, redirectToVerifyBusiness, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

type PayType = 'fixed' | 'hourly';

export default function CreateJobPage() {
  const { session, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const store = getStore();

  const hasRedirected = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // form
  const [title, setTitle] = useState('');
  const [tradeCategory, setTradeCategory] = useState(''); // auto-set from primary trade
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [durationDays, setDurationDays] = useState('1');
  const [payType, setPayType] = useState<PayType>('fixed');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');

  // dates
  const [multipleDates, setMultipleDates] = useState(false);
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // files
  const [files, setFiles] = useState<File[]>([]);

  // success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | undefined>(undefined);

  // MUST be above any early return (rules-of-hooks)
  const computedMultiDurationDays = useMemo(() => {
    if (!multipleDates || !dateFrom || !dateTo) return null;
    const diff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  }, [multipleDates, dateFrom, dateTo]);

  // Keep tradeCategory in sync with user.primaryTrade once user loads
  useEffect(() => {
    if (!tradeCategory && currentUser?.primaryTrade) {
      setTradeCategory(currentUser.primaryTrade);
    }
  }, [tradeCategory, currentUser?.primaryTrade]);

  // ABN gate: redirect only after profile has loaded (avoid gating verified users during load).
  useEffect(() => {
    if (isLoading || hasRedirected.current) return;
    if (!session?.user) {
      hasRedirected.current = true;
      const loginUrl = '/login?returnUrl=/jobs/create';
      safeRouterPush(router, loginUrl, '/login');
      return;
    }
    if (!currentUser) return; // wait for profile
    if (needsBusinessVerification(currentUser)) {
      hasRedirected.current = true;
      redirectToVerifyBusiness(router, '/jobs/create');
      return;
    }
  }, [isLoading, session?.user, currentUser, router]);

  if (!session?.user) return null;

  if (isLoading || (session?.user && !currentUser)) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-4xl items-center justify-center p-8">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) return null;

  const abnStatusMessage = getABNStatusMessage(currentUser);
  const hasAbnPending = hasABNButNotVerified(currentUser);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    const totalSize = [...files, ...newFiles].reduce((sum, f) => sum + f.size, 0);
    const maxSize = 50 * 1024 * 1024;

    if (totalSize > maxSize) {
      toast.error('Total file size must be less than 50MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file(s) added`);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return toast.error('Please enter a job title');
    if (!tradeCategory.trim()) return toast.error('Please set a trade category');
    if (!location.trim() || !postcode.trim()) return toast.error('Please select a location with postcode');
    if (!description.trim()) return toast.error('Please enter a job description');
    if (!rate || Number(rate) <= 0) return toast.error('Please enter a valid price / hourly rate');

    let jobDates: Date[] = [];
    let duration: number;

    if (multipleDates) {
      if (!dateFrom || !dateTo) return toast.error('Please select both start and end dates');
      if (dateTo < dateFrom) return toast.error('End date cannot be earlier than start date');

      jobDates = [dateFrom];
      duration = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      if (!singleDate) return toast.error('Please select a date');

      jobDates = [singleDate];
      duration = Math.max(1, parseInt(durationDays || '1', 10) || 1);
    }

    // Note: these are local blob URLs (MVP). Replace with Supabase storage later.
    const attachments = files.map((file) => URL.createObjectURL(file));

    const newJob = {
      id: `job-${Date.now()}`,
      contractorId: currentUser.id, // "postedBy" user id (single account)
      title: title.trim(),
      description: description.trim(),
      tradeCategory: tradeCategory.trim(),
      location: location.trim(),
      postcode: postcode.trim(),
      dates: jobDates,
      startTime,
      duration,
      payType,
      rate: Number(rate),
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'open' as const,
      createdAt: new Date(),
    };

    if (currentUser && needsBusinessVerification(currentUser)) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, '/jobs/create');
      return;
    }

    try {
      console.warn('[ABN WRITE ATTEMPT]', 'jobs (store)', { id: newJob.id, title: newJob.title }); // ABN_QA_ONLY
      store.createJob(newJob);
      setCreatedJobId(newJob.id);
      setShowSuccessModal(true);
      toast.success('Job posted');
    } catch (err) {
      console.error('[Jobs] createJob failed:', err);
      toast.error('Failed to post job. Please try again.');
    }
  };

  return (
    <AppLayout>
        <div className="mx-auto max-w-4xl p-4 md:p-6">
          <PageHeader backLink={{ href: '/jobs' }} title="Post a New Job" />

          {abnStatusMessage && (
            <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-yellow-900">ABN Verification Required</p>
                  <p className="text-sm text-yellow-800">{abnStatusMessage}</p>

                  {currentUser.abnStatus === 'REJECTED' && (
                    <Link href={getVerifyBusinessUrl('/jobs/create')}>
                      <Button size="sm" className="mt-3">
                        Update ABN Details
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Electrical Rewire - Kitchen & Living Room"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tradeCategory">Trade Category</Label>
                <Input
                  id="tradeCategory"
                  type="text"
                  value={currentUser.primaryTrade || tradeCategory}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Auto-set from your primary trade.
                  {!MVP_FREE_MODE && (
                    <>
                      {' '}
                      <Link href="/pricing" className="font-medium text-blue-600 hover:text-blue-700">
                        Add extra trades
                      </Link>{' '}
                      <span className="text-gray-400">(Premium)</span>
                    </>
                  )}
                </p>
              </div>

              <SuburbAutocomplete
                value={location}
                postcode={postcode}
                onSuburbChange={setLocation}
                onPostcodeChange={setPostcode}
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
                      <Label>Date</Label>
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
                          <CalendarComponent mode="single" selected={singleDate} onSelect={setSingleDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
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
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Date from</Label>
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
                          <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Date to</Label>
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
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {computedMultiDurationDays !== null && (
                  <p className="mt-2 text-xs text-gray-500">Duration: {computedMultiDurationDays} days</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="payType">Pay Type</Label>
                  <Select value={payType} onValueChange={(v) => setPayType(v as PayType)}>
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
                  <Label htmlFor="rate">{payType === 'hourly' ? 'Hourly Rate ($)' : 'Asking Price ($)'}</Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder={payType === 'hourly' ? 'e.g. 60' : 'e.g. 2400'}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about the job, requirements, and any special instructions..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="files">Upload plans, photos, or specs (optional)</Label>
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="files"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
                  </Button>
                  <p className="mt-1 text-xs text-gray-500">Images, PDFs, or documents. Max 50MB total.</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 flex-shrink-0 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={hasAbnPending}>
                  Post Job
                </Button>
                <Link href="/jobs" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>

              {hasAbnPending && (
                <p className="text-center text-xs text-gray-500">You can post jobs once your ABN has been verified</p>
              )}
            </form>
          </div>
        </div>
        {!MVP_FREE_MODE && (
          <PremiumJobUpsellModal open={showSuccessModal} onOpenChange={setShowSuccessModal} jobId={createdJobId} />
        )}
      </AppLayout>
  );
}
