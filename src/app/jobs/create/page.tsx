// @ts-nocheck
'use client';

/*
 * QA notes — Jobs create:
 * - Contractor role required (matches RLS on `jobs` INSERT/UPDATE/DELETE for own rows). Subcontractor/admin-without-contractor see inline message.
 * - ABN optional for posting (trust signal only).
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon, Camera, Clock, Loader2, Upload, X, FileText, Info } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { PremiumJobUpsellModal } from '@/components/premium-job-upsell-modal';

import { Button } from '@/components/ui/button';
import { RefinePillButton } from '@/components/ai/RefinePillButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverContentWithDone } from '@/components/ui/popover-content-with-done';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';

import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { useAuth } from '@/lib/auth';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { getABNStatus, getABNStatusMessage, hasValidABN } from '@/lib/abn-utils';
import { useActiveTradesCatalog } from '@/lib/trades/use-active-trades-catalog';
import { safeRouterPush } from '@/lib/safe-nav';
import { getVerifyBusinessUrl } from '@/lib/verification-guard';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import { FREE_JOB_POST_LIMIT_MESSAGE, JOB_POST_LIMIT_ERROR_CODE } from '@/lib/job-post-limits';
import { canCreateJob } from '@/lib/permissions';
import { JOB_POST_CONTRACTOR_ROLE_CODE, JOB_POST_CONTRACTOR_ROLE_MESSAGE } from '@/lib/jobs/job-post-role-messages';

type PayType = 'fixed' | 'hourly' | 'day_rate';

/** Format 24h time (e.g. "08:00") for display as 12h (e.g. "8:00 AM"). */
function formatTimeDisplay(time24: string): string {
  if (!time24 || !time24.includes(':')) return 'Select time';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h === 0) return `12:${pad(m)} AM`;
  if (h < 12) return `${h}:${pad(m)} AM`;
  if (h === 12) return `12:${pad(m)} PM`;
  return `${h - 12}:${pad(m)} PM`;
}

export default function CreateJobPage() {
  const { session, currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/');
    }
  }, [currentUser, router]);

  const hasRedirected = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);

  // form
  const [title, setTitle] = useState('');
  const [tradeCategory, setTradeCategory] = useState(''); // auto-set from primary trade
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  const [jobPlaceId, setJobPlaceId] = useState<string | null>(null);
  const [jobLat, setJobLat] = useState<number | null>(null);
  const [jobLng, setJobLng] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('07:00');
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | undefined>(undefined);

  const [isRefiningDescription, setIsRefiningDescription] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postLimitInfo, setPostLimitInfo] = useState<{
    unlimited: boolean;
    usedInWindow?: number;
    maxFree?: number;
    windowDays?: number;
  } | null>(null);

  // MUST be above any early return (rules-of-hooks)
  const computedMultiDurationDays = useMemo(() => {
    if (!multipleDates || !dateFrom || !dateTo) return null;
    const diff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  }, [multipleDates, dateFrom, dateTo]);

  const userForDiscovery = useMemo(
    () =>
      currentUser
        ? {
            plan: (currentUser as any).plan ?? null,
            subscription_status:
              (currentUser as any).subscriptionStatus ?? (currentUser as any).subscription_status ?? null,
            complimentary_premium_until:
              (currentUser as any).complimentaryPremiumUntil ??
              (currentUser as any).complimentary_premium_until ??
              null,
          }
        : null,
    [currentUser]
  );
  const isPremium = isPremiumForDiscovery(userForDiscovery);
  const { names: catalogTradeNames, loading: catalogTradesLoading } = useActiveTradesCatalog();

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

  const tradeOptions = useMemo(
    () => (isPremium ? catalogTradeNames : posterTrades),
    [isPremium, catalogTradeNames, posterTrades]
  );

  useEffect(() => {
    if (!tradeCategory && posterTrades.length > 0) {
      setTradeCategory(posterTrades[0]);
    }
  }, [tradeCategory, posterTrades]);

  const refreshPostLimit = useCallback(async () => {
    if (!currentUser?.id) return;
    if (isPremium) {
      setPostLimitInfo({ unlimited: true });
      return;
    }
    try {
      const res = await fetch('/api/jobs/post-limit', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostLimitInfo(null);
        return;
      }
      if (data.unlimited) {
        setPostLimitInfo({ unlimited: true });
        return;
      }
      setPostLimitInfo({
        unlimited: false,
        usedInWindow: data.usedInWindow ?? 0,
        maxFree: data.maxFree ?? 1,
        windowDays: data.windowDays ?? 30,
      });
    } catch {
      setPostLimitInfo(null);
    }
  }, [currentUser?.id, isPremium]);

  useEffect(() => {
    void refreshPostLimit();
  }, [refreshPostLimit]);

  useEffect(() => {
    if (isLoading || hasRedirected.current) return;
    if (!session?.user) {
      hasRedirected.current = true;
      const loginUrl = '/login?returnUrl=/jobs/create';
      safeRouterPush(router, loginUrl, '/login');
      return;
    }
  }, [isLoading, session?.user, router]);

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

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  const abnStatusDetail = getABNStatusMessage(currentUser);
  const showAbnTrustNotice = currentUser && !hasValidABN(currentUser);
  const canPostByRole = canCreateJob(currentUser);

  const atFreeJobLimit =
    !isPremium &&
    postLimitInfo !== null &&
    !postLimitInfo.unlimited &&
    (postLimitInfo.usedInWindow ?? 0) >= (postLimitInfo.maxFree ?? 1);

  const freeJobUsageLine =
    postLimitInfo && !postLimitInfo.unlimited && postLimitInfo.maxFree != null && postLimitInfo.windowDays != null
      ? `${Math.min(postLimitInfo.usedInWindow ?? 0, postLimitInfo.maxFree)} of ${postLimitInfo.maxFree} free job posts used in the last ${postLimitInfo.windowDays} days.`
      : null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const maxSize = 50 * 1024 * 1024;

    let addedCount = 0;
    setSelectedFiles((prev) => {
      const merged = [...prev, ...picked];

      const deduped = merged.filter(
        (file, index, self) =>
          index ===
          self.findIndex(
            (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
          )
      );

      const totalSize = deduped.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > maxSize) {
        toast.error('Total file size must be less than 50MB. Some files were not added.');
        return prev;
      }

      addedCount = deduped.length - prev.length;
      return deduped;
    });

    if (addedCount > 0) toast.success(`${addedCount} file(s) added`);

    if (e.target) (e.target as HTMLInputElement).value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function uploadJobFiles(supabase: any, jobId: string, files: File[]) {
    const uploaded: any[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${jobId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('job-attachments')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (upErr) throw upErr;

      uploaded.push({
        bucket: 'job-attachments',
        path,
        name: safeName,
        type: file.type || null,
        size: file.size || null,
      });
    }

    return uploaded;
  }

  async function refineJobDescriptionWithAI() {
    const raw = String(description ?? '').trim();
    if (!raw) {
      toast.error('Enter a job description first, then refine with AI.');
      return;
    }

    try {
      setIsRefiningDescription(true);
      const res = await fetch('/api/ai/refine-job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: raw,
          mode: 'description',
          trade: tradeCategory || undefined,
          location: location || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Could not refine description.');
        return;
      }

      const refined = String(data?.refined ?? '').trim();
      if (!refined) {
        toast.error('AI did not return a refinement. Try again.');
        return;
      }

      setDescription(refined);
      toast.success('Job description refined.');
    } catch (e) {
      console.error('[jobs/create] refine description failed', e);
      toast.error('Could not refine description.');
    } finally {
      setIsRefiningDescription(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!canPostByRole) {
      toast.error(JOB_POST_CONTRACTOR_ROLE_MESSAGE);
      return;
    }

    if (atFreeJobLimit) {
      toast.error(FREE_JOB_POST_LIMIT_MESSAGE);
      return;
    }

    if (!title.trim()) return toast.error('Please enter a job title');
    if (!tradeCategory.trim()) return toast.error('Please set a trade category');
    if (!location.trim() || !postcode.trim()) return toast.error('Please select a location with postcode');
    if (jobLat == null || jobLng == null) {
      return toast.error('Please select a location from the dropdown so we can calculate distance.');
    }
    if (!description.trim()) return toast.error('Please enter a job description');
    const rateNum = rate.trim() ? Number(rate) : null;
    if (rateNum != null && (!Number.isFinite(rateNum) || rateNum <= 0)) {
      return toast.error('Please enter a valid price / hourly rate');
    }

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

    try {
      setIsSubmitting(true);
      const datesIso = jobDates.map((d) => d.toISOString());

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          trade_category: tradeCategory.trim(),
          location: location.trim(),
          postcode: postcode.trim(),
          dates: datesIso,
          start_time: startTime,
          duration,
          pay_type: payType,
          rate: rateNum,
          location_place_id: jobPlaceId,
          location_lat: jobLat,
          location_lng: jobLng,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === JOB_POST_LIMIT_ERROR_CODE) {
          toast.error(typeof data?.error === 'string' ? data.error : FREE_JOB_POST_LIMIT_MESSAGE);
          void refreshPostLimit();
          return;
        }
        if (data?.code === JOB_POST_CONTRACTOR_ROLE_CODE) {
          toast.error(typeof data?.error === 'string' ? data.error : JOB_POST_CONTRACTOR_ROLE_MESSAGE);
          return;
        }
        throw new Error(data?.error || 'Failed to create job');
      }

      const rawCreatedId = data?.id;
      const createdJobId =
        typeof rawCreatedId === 'string'
          ? rawCreatedId.trim()
          : rawCreatedId != null && rawCreatedId !== ''
            ? String(rawCreatedId).trim()
            : '';
      if (!createdJobId) throw new Error('No job ID returned');

      // Upload attachments (optional)
      const supabase = getBrowserSupabase();
      let uploaded: any[] = [];
      if (selectedFiles.length > 0) {
        uploaded = await uploadJobFiles(supabase, createdJobId, selectedFiles);
      }

      if (uploaded.length > 0) {
        const { error: attachUpdateError } = await supabase
          .from('jobs')
          .update({
            attachments: uploaded,
            file_url: null,
            file_name: uploaded?.[0]?.name ?? null,
          })
          .eq('id', createdJobId);

        if (attachUpdateError) {
          console.error('[jobs/create] failed to save attachments', attachUpdateError);
          toast.error('Job posted, but attachments failed to save.');
        }
      }

      setCreatedJobId(createdJobId);
      toast.success('Job posted');

      if (MVP_FREE_MODE) {
        safeRouterPush(router, `/jobs/${createdJobId}`, '/jobs');
      } else if (isPremium) {
        // Premium users: no upsell, go straight to job
        safeRouterPush(router, `/jobs/${createdJobId}`, '/jobs');
      } else {
        // Free users: show upsell modal
        setShowSuccessModal(true);
      }

      // Fire-and-forget: send email alerts to eligible premium users (do not block on success)
      fetch('/api/alerts/send-for-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingType: 'job', listingId: createdJobId }),
      }).catch((e) => console.warn('[jobs/create] alert send failed:', e));
    } catch (err) {
      console.error('[Jobs] insert failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to post job. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-slate-900">
        {/* Dotted overlay - behind watermark */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
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
        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
          <PageHeader backLink={{ href: '/jobs' }} title="Post a New Job" tone="dark" />

          {!canPostByRole && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
                <div className="space-y-2 text-sm text-amber-950">
                  <p className="font-medium">Contractor account required</p>
                  <p>{JOB_POST_CONTRACTOR_ROLE_MESSAGE}</p>
                  <Button asChild size="sm" variant="outline" className="mt-1 border-amber-300 bg-white">
                    <Link href="/jobs">Go to Jobs</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showAbnTrustNotice && (
            <div className="mb-6 rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-slate-800">
                    ABN verification is optional for job posting and acts as a trust signal. Verified businesses may build
                    more trust with other users.
                  </p>
                  {abnStatusDetail ? <p className="text-sm text-slate-600">{abnStatusDetail}</p> : null}
                  <div className="pt-1">
                    <Button asChild size="sm" variant="outline">
                      <Link href={getVerifyBusinessUrl('/jobs/create')}>
                        {getABNStatus(currentUser) === 'REJECTED' ? 'Update ABN details (optional)' : 'Verify business (optional)'}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isPremium && postLimitInfo && !postLimitInfo.unlimited && (
            <div
              className={`mb-6 rounded-xl border p-4 ${
                atFreeJobLimit ? 'border-amber-300 bg-amber-50' : 'border-slate-200/90 bg-white/95 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-600" aria-hidden />
                <div className="flex-1 space-y-2">
                  {freeJobUsageLine ? (
                    <p className="text-sm text-slate-800">{freeJobUsageLine}</p>
                  ) : null}
                  {atFreeJobLimit ? (
                    <>
                      <p className="text-sm font-medium text-amber-950">
                        Your free job limit has been reached. Upgrade for unlimited jobs.
                      </p>
                      <Button asChild size="sm" className="mt-1">
                        <Link href="/pricing">Upgrade to Premium</Link>
                      </Button>
                    </>
                  ) : null}
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
                {!isPremium && posterTrades.length === 0 ? (
                  <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Free accounts need at least one trade on your profile to pick a job category — this is separate from
                    ABN verification.
                    <Link href="/profile/edit" className="ml-1 font-medium text-amber-700 underline hover:text-amber-900">
                      Edit profile
                    </Link>
                  </div>
                ) : (
                  <Select
                    value={tradeCategory || (posterTrades[0] ?? tradeOptions[0] ?? '')}
                    onValueChange={setTradeCategory}
                    disabled={
                      (!isPremium && posterTrades.length <= 1) ||
                      (isPremium && catalogTradesLoading && catalogTradeNames.length === 0)
                    }
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
                value={location}
                postcode={postcode}
                onSuburbChange={(v) => {
                  setLocation(v);
                  // User typed manually — clear auto-filled fields so we don't post stale data
                  setPostcode('');
                  setJobLat(null);
                  setJobLng(null);
                  setJobPlaceId(null);
                }}
                onPostcodeChange={setPostcode}
                onPlaceIdChange={setJobPlaceId}
                onLatLngChange={(lat, lng) => {
                  setJobLat(typeof lat === 'number' ? lat : null);
                  setJobLng(typeof lng === 'number' ? lng : null);
                }}
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
                            className={`group mt-1 w-full justify-start text-left font-normal ${!singleDate ? 'text-gray-500' : ''}`}
                          >
                            <span className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                              <CalendarIcon className="h-5 w-5" />
                            </span>
                            <span className="ml-2">{singleDate ? formatDate(singleDate, 'dd/MM/yyyy') : 'Select date'}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContentWithDone className="w-auto" align="start">
                          <CalendarComponent mode="single" selected={singleDate} onSelect={setSingleDate} initialFocus />
                        </PopoverContentWithDone>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="group mt-1 w-full justify-start text-left font-normal"
                        onClick={() => {
                          startTimeInputRef.current?.focus();
                          (startTimeInputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startTimeInputRef.current?.focus();
                            (startTimeInputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
                          }
                        }}
                      >
                        <span className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                          <Clock className="h-5 w-5" />
                        </span>
                        <span className="ml-2">{formatTimeDisplay(startTime)}</span>
                      </Button>
                      <input
                        ref={startTimeInputRef}
                        id="startTime"
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="sr-only"
                        aria-hidden
                        tabIndex={-1}
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
                            className={`group mt-1 w-full justify-start text-left font-normal ${!dateFrom ? 'text-gray-500' : ''}`}
                          >
                            <span className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                              <CalendarIcon className="h-5 w-5" />
                            </span>
                            <span className="ml-2">{dateFrom ? formatDate(dateFrom, 'dd/MM/yyyy') : 'Select start date'}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContentWithDone className="w-auto" align="start">
                          <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                        </PopoverContentWithDone>
                      </Popover>
                    </div>

                    <div>
                      <Label>Date to</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`group mt-1 w-full justify-start text-left font-normal ${!dateTo ? 'text-gray-500' : ''}`}
                          >
                            <span className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                              <CalendarIcon className="h-5 w-5" />
                            </span>
                            <span className="ml-2">{dateTo ? formatDate(dateTo, 'dd/MM/yyyy') : 'Select end date'}</span>
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
                      <Button
                        type="button"
                        variant="outline"
                        className="group mt-1 w-full justify-start text-left font-normal"
                        onClick={() => {
                          startTimeInputRef.current?.focus();
                          (startTimeInputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startTimeInputRef.current?.focus();
                            (startTimeInputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
                          }
                        }}
                      >
                        <span className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-blue-50 p-1.5 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                          <Clock className="h-5 w-5" />
                        </span>
                        <span className="ml-2">{formatTimeDisplay(startTime)}</span>
                      </Button>
                      <input
                        ref={startTimeInputRef}
                        id="startTimeMulti"
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="sr-only"
                        aria-hidden
                        tabIndex={-1}
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
                      <SelectItem value="day_rate">Day rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rate">
                    {payType === 'hourly'
                      ? 'Hourly Rate ($)'
                      : payType === 'day_rate'
                        ? 'Day Rate ($)'
                        : 'Asking Price ($)'}
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder={
                      payType === 'hourly'
                        ? 'Optional (e.g. 60)'
                        : payType === 'day_rate'
                          ? 'Optional (e.g. 600)'
                          : 'Optional (e.g. 2400)'
                    }
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
                <div className="mt-2 flex justify-end">
                  <RefinePillButton
                    size="sm"
                    variant="secondary"
                    loading={isRefiningDescription}
                    disabled={!String(description ?? '').trim()}
                    onClick={refineJobDescriptionWithAI}
                    title={
                      !String(description ?? '').trim()
                        ? 'Enter a job description first'
                        : 'Refine your existing text (does not invent scope)'
                    }
                  />
                </div>
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
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-hidden
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-w-0 flex-1"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="min-w-0 flex-1 sm:hidden"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Images, PDFs, or documents. Max 50MB total.</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
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

              <p className="text-center text-xs text-slate-600">
                You can post jobs without ABN verification. Some later platform actions may still require verification.
              </p>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || atFreeJobLimit || !canPostByRole}
                  title={
                    !canPostByRole
                      ? JOB_POST_CONTRACTOR_ROLE_MESSAGE
                      : atFreeJobLimit
                        ? 'You have reached your free job post limit for this period. Upgrade for unlimited posting.'
                        : undefined
                  }
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting Job...
                    </span>
                  ) : (
                    'Post Job'
                  )}
                </Button>
                <Link href="/jobs" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>

            </form>
          </div>
        </div>
      </div>
      {!MVP_FREE_MODE && !isPremium && createdJobId && (
          <PremiumJobUpsellModal
            open={showSuccessModal}
            onOpenChange={setShowSuccessModal}
            jobId={createdJobId}
          />
        )}
      </AppLayout>
  );
}
