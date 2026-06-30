// vim: ts=2
// @ts-nocheck
'use client';
/*
 * QA notes — Job edit:
 * - Owner with contractor role can save (matches hiring/job-post model, API, and RLS on `jobs` UPDATE). ABN optional for jobs.
 */

export const dynamic = "force-dynamic";

import { getAxios } from "@/lib/utils";
import UserContext from "@/lib/user-context";
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { safeRouterPush } from '@/lib/safe-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverContentWithDone } from '@/components/ui/popover-content-with-done';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/style.css";
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon, X, Upload, FileText, Image as ImageIcon, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { useActiveTradesCatalog } from '@/lib/trades/use-active-trades-catalog';

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

  const { jwt } = useAuth();
  const params = useParams();
  const router = useRouter();
	const UserSession = useContext(UserContext);
  const jobId = params.id as string;

  const [formData, setFormData] = useState({
    title: '',
    tradeCategory: '',
    location: '',
    postcode: '',
		placeId: null,
		latitude: null,
		longitude: null,
    startTime: '08:00',
    duration: '1',
    payType: 'fixed',
    rate: '',
    description: '',
  });

	const [job, setJob] = useState(null);
	const [currentUser, setCurrentUser] = useState(UserSession?.user ?? null);
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [multipleDates, setMultipleDates] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const hydratedRef = useRef(false);

	const isLoading = currentUser === null || job === null;
  const isPremium = currentUser?.profile?.premium ?? false;
  const { names: catalogTradeNames, loading: catalogTradesLoading } = useActiveTradesCatalog();

  const posterTrades = useMemo(() => {
    const t = currentUser?.business?.trades;
    if (Array.isArray(t) && t.length > 0) {
      return t.filter((x: string) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    }
    const pt = currentUser?.business?.primaryTrade ?? null;
    const at = [];
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
    if (job !== null){ 
			return; 
		}
		getAxios(null).get(`/api/jobs/${jobId}`).
			then((response)=>{
				const data = response.data;
    		setFormData({
      		title: data?.title ?? "",
     			tradeCategory: data?.tradeCategory ?? "",
      		location: data?.location ?? "",
      		postcode: data?.postcode ?? "",
					latitude: data?.latitude ?? null,
					longitude: data?.longitude ?? null,
					placeId: null,
      		startTime: data?.startTime ?? '08:00',
      		duration: data?.durationDays?.toString() || "1",
      		payType: data?.payType ?? "fixed",
      		rate: data?.rate?.toString() ?? "",
      		description: data?.description ?? "",
    		});
    		const firstDate = data?.dates[0] ?? null;
    		setSingleDate(firstDate ? new Date(firstDate) : null);
				const att = data?.attachments ?? [];
				const mappedAtts = att.map((e,i)=>{
					return { ...e, type: e.mime, name: e.fileName };
				});
    		setAttachments(mappedAtts);
				// set job last
				// as this will trigger the hook again
				setJob(data);
			}).catch((error)=>{
				toast.error("Failed to load job");
			});
  }, [job]);

  const isOwner = job && currentUser && currentUser.id === job.owner.id;
  const canSaveListing = currentUser && job && currentUser.id === job.owner.id;
  const roleBlocksEditing = false; // never true, no other roles appart from user and admin
  const isRedirecting = !job || (currentUser && job && currentUser.id !== job.owner.id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-4xl items-center justify-center p-8">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !job || job.owner.id !== currentUser.id) {
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
      tradeCategory: formData.tradeCategory,
      location: formData.location,
			placeId: formData.placeId,
			latitude: formData.longitude,
			longitude: formData.latitude,
      postcode: formData.postcode,
      payType: formData.payType,
      rate: formData.rate.trim() ? Number(formData.rate) : null,
      startTime: formData.startTime || null,
      durationDays: multipleDates ? (datesISO.length || null) : durationDays,
      dates: datesISO,
			attachments
    };
    try{
			await getAxios(null).put(`/api/jobs/${jobId}`, payload);
      toast.success('Job updated successfully');
      safeRouterPush(router, `/jobs/${jobId}`, '/jobs');
    }catch (err){
      console.error('[jobs/edit] update failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      toast.error(msg);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

	const readFile = async (file:File) => {
		return new Promise(async(resolve, reject)=>{
			const reader = new FileReader();
			reader.addEventListener("load", resolve);
			reader.addEventListener("error", reject);
			reader.readAsDataURL(file);
		});
	};

  async function handleAddAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
		const p = /^data:([^;]+);base64,(.*)$/;
		const attachments_ = []; // local
		for(const f of files){
			const fileName = f.name;
			const event = await readFile(f);	
			const url = event.target.result;
			const match = p.exec(url);	
			if(match){
				const mime = match[1];
				const data = match[2];
				attachments_.push({mime, data, fileName, name:fileName, type:mime});
			}else{
				console.error(`Could not match regex, url was ${url}`);
			}
		}
		setAttachments([...attachments, ...attachments_]);
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
                    Free accounts need at least one trade on your profile to change category — not related to ABN
                    verification.
                    <Link href="/profile/edit" className="ml-1 font-medium text-amber-700 underline hover:text-amber-900">
                      Edit profile
                    </Link>
                  </div>
                ) : (
                  <Select
                    value={formData.tradeCategory || (posterTrades[0] ?? tradeOptions[0] ?? '')}
                    onValueChange={(v) => handleChange('tradeCategory', v)}
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
                value={formData.location}
                postcode={formData.postcode}
                onSuburbChange={(value) => handleChange('location', value)}
                onPostcodeChange={(value) => handleChange('postcode', value)}
								onLatLngChange={(latitude, longitude)=>{handleChange("latitude", latitude);handleChange("longitude", longitude);}}
								onPlaceIdChange={(placeId)=>handleChange("placeId", placeId)}
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
												<DayPicker
            							animate
            							mode="single"
            							selected={singleDate}
            							onSelect={setSingleDate}
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
												<DayPicker
            							animate
            							mode="single"
            							selected={dateFrom}
            							onSelect={setDateFrom}
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
												<DayPicker
            							animate
            							mode="single"
            							selected={dateTo}
            							onSelect={setDateTo}
                          disabled={(date) => (dateFrom ? date < dateFrom : false)}
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

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <p>
                  You can post jobs without ABN verification. Some later platform actions may still require verification.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/jobs/${jobId}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!canSaveListing}
                  title={!canSaveListing ? JOB_EDIT_CONTRACTOR_ROLE_MESSAGE : undefined}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
