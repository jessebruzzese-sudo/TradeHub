// @ts-nocheck
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
import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverContentWithDone } from '@/components/ui/popover-content-with-done';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon, X, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getBrowserSupabase } from '@/lib/supabase-client';

type JobAttachment = {
  name: string;
  path: string;
  size?: number;
  type?: string;
  bucket?: string;
};

function buildDateRangeISO(from: Date, to: Date): string[] {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const out: string[] = [];
  const cur = new Date(start);

  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString());
    cur.setDate(cur.getDate() + 1);
  }

  return out;
}

function prettySize(bytes?: number) {
  if (typeof bytes !== 'number') return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const hasRedirectedAbn = useRef(false);
  const hydratedRef = useRef(false);

  const userForDiscovery = useMemo(
    () =>
      currentUser
        ? {
            plan: (currentUser as any).plan ?? null,
            is_premium: (currentUser as any).isPremium ?? (currentUser as any).is_premium ?? undefined,
            subscription_status: (currentUser as any).subscriptionStatus ?? (currentUser as any).subscription_status ?? null,
            active_plan: (currentUser as any).activePlan ?? (currentUser as any).active_plan ?? null,
            subcontractor_plan: undefined,
            subcontractor_sub_status: undefined,
          }
        : null,
    [currentUser]
  );
  const isPremium = isPremiumForDiscovery(userForDiscovery);

  const posterTrades = useMemo(() => {
    const t = (currentUser as any)?.trades;
    if (Array.isArray(t) && t.length > 0) {
      return t.filter((x: string) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    }
    const pt = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade;
    const at = (currentUser as any)?.additionalTrades ?? (currentUser as any)?.additional_trades;
    const out = pt ? [String(pt).trim()] : [];
    if (Array.isArray(at)) {
      at.forEach((x: string) => {
        const s = String(x).trim();
        if (s && !out.includes(s)) out.push(s);
      });
    }
    return out;
  }, [currentUser]);

  const tradeOptions = isPremium ? TRADE_CATEGORIES : posterTrades;

  // Hydrate form when job becomes available (handles async store population).
  useEffect(() => {
    if (!job || hydratedRef.current) return;
    hydratedRef.current = true;
    setFormData({
      title: job.title || '',
      tradeCategory: job.tradeCategory || posterTrades[0] || '',
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
    setAttachments(Array.isArray((job as any).attachments) ? ((job as any).attachments as JobAttachment[]) : []);
  }, [job, posterTrades]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !job || !canEditJob(currentUser, job)) {
      if (currentUser && job && ownsJob(currentUser, job) && needsBusinessVerification(currentUser)) {
        toast.error('Verify your ABN to continue.');
        redirectToVerifyBusiness(router, `/jobs/${jobId}/edit`);
      }
      return;
    }

    if (multipleDates) {
      if (!dateFrom || !dateTo) {
        toast.error('Please select both start and end dates');
        return;
      }
      if (dateTo < dateFrom) {
        toast.error('End date cannot be earlier than start date');
        return;
      }
    } else {
      if (!singleDate) {
        toast.error('Please select a date');
        return;
      }
    }

    const datesISO = multipleDates
      ? buildDateRangeISO(dateFrom!, dateTo!)
      : singleDate
        ? [new Date(singleDate).toISOString()]
        : [];

    const durationDays = parseInt(formData.duration, 10) || 1;

    const payload: Record<string, unknown> = {
      title: formData.title,
      description: formData.description,
      trade_category: formData.tradeCategory,
      location: formData.location,
      postcode: formData.postcode,
      pay_type: formData.payType,
      rate: formData.rate.trim() ? Number(formData.rate) : null,
      start_time: formData.startTime || null,
      duration: multipleDates ? (datesISO.length || null) : durationDays,
      dates: datesISO,
      attachments,
    };

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update job');
      }

      store.updateJob(jobId, {
        title: formData.title,
        description: formData.description,
        tradeCategory: formData.tradeCategory,
        location: formData.location,
        postcode: formData.postcode,
        dates: datesISO.map((d) => new Date(d)),
        startTime: formData.startTime,
        duration: multipleDates ? datesISO.length : durationDays,
        payType: formData.payType as 'fixed' | 'hourly' | 'day_rate',
        rate: formData.rate.trim() ? Number(formData.rate) : null,
        attachments: attachments as any,
      });

      toast.success('Job updated successfully');
      safeRouterPush(router, `/jobs/${jobId}`, '/jobs');
    } catch (err) {
      console.error('[jobs/edit] update failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      toast.error(msg);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleAddAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const supabase = getBrowserSupabase();

      const uploaded: JobAttachment[] = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'bin';
        const cleanName = file.name.replace(/[^\w.\-() ]+/g, '_');
        const path = `${jobId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('job-attachments')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upErr) {
          console.error('upload error', upErr);
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }

        uploaded.push({
          name: cleanName,
          path,
          size: file.size,
          type: file.type,
          bucket: 'job-attachments',
        });
      }

      if (uploaded.length) {
        setAttachments((prev) => [...prev, ...uploaded]);
        toast.success(`Uploaded ${uploaded.length} file(s)`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <AppLayout>
      <div className="relative min-h-screen bg-gradient-to-b from-blue-700 via-blue-800 to-blue-900">
        {/* Dotted overlay - behind watermark */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        {/* Watermark (fixed to viewport) - above background, behind content */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-whiteout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.08]"
          />
        </div>

        {/* Page content */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10 pb-16 md:pb-20">
          <PageHeader backLink={{ href: `/jobs/${jobId}` }} title="Edit Job" tone="dark" />

          <div className="rounded-2xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition-shadow p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Job details */}
            <div className="space-y-6">
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
                {!isPremium && posterTrades.length === 0 ? (
                  <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Add a trade to your profile to edit job trade.
                    <Link href="/profile/edit" className="ml-1 font-medium text-amber-700 underline hover:text-amber-900">
                      Edit profile
                    </Link>
                  </div>
                ) : (
                  <Select
                    value={formData.tradeCategory || (posterTrades[0] ?? tradeOptions[0] ?? '')}
                    onValueChange={(v) => handleChange('tradeCategory', v)}
                    disabled={!isPremium && posterTrades.length <= 1}
                  >
                    <SelectTrigger id="tradeCategory" className="mt-1">
                      <SelectValue placeholder="Select trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {tradeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {isPremium
                    ? 'Premium accounts can post jobs under any trade category. The job will be shown to matching businesses in that trade.'
                    : 'Trade category is limited to your listed trade.'}
                </p>
              </div>

              <SuburbAutocomplete
                value={formData.location}
                postcode={formData.postcode}
                onSuburbChange={(value) => handleChange('location', value)}
                onPostcodeChange={(value) => handleChange('postcode', value)}
                required
              />
            </div>

            <hr className="my-6 border-t border-slate-200" />

            {/* Section: Schedule */}
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
                      <PopoverContentWithDone className="w-auto" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={singleDate}
                          onSelect={setSingleDate}
                          initialFocus
                        />
                      </PopoverContentWithDone>
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
                      <PopoverContentWithDone className="w-auto" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContentWithDone>
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
                      <PopoverContentWithDone className="w-auto" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          disabled={(date) => (dateFrom ? date < dateFrom : false)}
                          initialFocus
                        />
                      </PopoverContentWithDone>
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

            <hr className="my-6 border-t border-slate-200" />

            {/* Section: Pay */}
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
                    <SelectItem value="day_rate">Day rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rate">
                  {formData.payType === 'hourly'
                    ? 'Hourly Rate ($)'
                    : formData.payType === 'day_rate'
                      ? 'Day Rate ($)'
                      : 'Asking Price ($)'}
                </Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  placeholder={
                    formData.payType === 'hourly'
                      ? 'Optional (e.g. 60)'
                      : formData.payType === 'day_rate'
                        ? 'Optional (e.g. 600)'
                        : 'Optional (e.g. 2400)'
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <hr className="my-6 border-t border-slate-200" />

            {/* Section: Description */}
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

            <hr className="my-6 border-t border-slate-200" />

            {/* Section: Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleAddAttachments(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading…' : 'Add files'}
                  </Button>
                </div>
              </div>

              {attachments.length === 0 ? (
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                  No attachments yet. Add images or PDFs (plans).
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((a, idx) => {
                    const isImg = String(a.type || '').startsWith('image/');
                    return (
                      <div
                        key={`${a.path}-${idx}`}
                        className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2"
                      >
                        {isImg ? (
                          <ImageIcon className="h-4 w-4 text-slate-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-500" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 truncate">{a.name}</div>
                          <div className="text-xs text-slate-500">
                            {a.type ? a.type : 'file'}
                            {a.size ? ` • ${prettySize(a.size)}` : ''}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(idx)}
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/jobs/${jobId}`)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
