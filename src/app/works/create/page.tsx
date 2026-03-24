'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { RefinePillButton } from '@/components/ai/RefinePillButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import { useAuth } from '@/lib/auth';
import { getTradeIcon } from '@/lib/trade-icons';
import {
  PREVIOUS_WORK_ALLOWED_MIME,
  PREVIOUS_WORK_CAPTION_MAX,
  PREVIOUS_WORK_LOCATION_MAX,
  PREVIOUS_WORK_MAX_BYTES_PER_IMAGE,
  PREVIOUS_WORK_MAX_IMAGES,
  PREVIOUS_WORK_TITLE_MAX,
} from '@/lib/previous-work';
import { refineWorkDescription } from '@/lib/ai/refine-work-description';
import { cn } from '@/lib/utils';

export default function CreateCompletedWorkPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  /** Captured when user picks a Places result; not sent to API yet (same as jobs flow). */
  const locationExtrasRef = useRef<{
    lat: number | null;
    lng: number | null;
    placeId: string | null;
  }>({ lat: null, lng: null, placeId: null });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isRefiningDescription, setIsRefiningDescription] = useState(false);

  const primaryTradeLabel =
    (currentUser?.primaryTrade && String(currentUser.primaryTrade).trim()) || null;
  const TradeIcon = primaryTradeLabel ? getTradeIcon(primaryTradeLabel) : null;

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/works/create')}`);
    }
  }, [currentUser, isLoading, router]);

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.size > 0);
    e.target.value = '';
    if (picked.length === 0) return;

    const badType = picked.find((f) => !PREVIOUS_WORK_ALLOWED_MIME.has((f.type || '').toLowerCase()));
    if (badType) {
      toast.error('Only JPEG, PNG, GIF, or WebP images are allowed.');
      return;
    }
    const tooBig = picked.find((f) => f.size > PREVIOUS_WORK_MAX_BYTES_PER_IMAGE);
    if (tooBig) {
      toast.error('Each image must be 10MB or smaller.');
      return;
    }

    setFiles((prev) => {
      const next = [...prev, ...picked].slice(0, PREVIOUS_WORK_MAX_IMAGES);
      if (prev.length + picked.length > PREVIOUS_WORK_MAX_IMAGES) {
        toast.message(`Using the first ${PREVIOUS_WORK_MAX_IMAGES} images only.`);
      }
      return next;
    });
  };

  const removeFileAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function refineWorkDescriptionWithAI() {
    const raw = String(caption ?? '').trim();
    if (!raw) {
      toast.error('Enter a description first, then refine with AI.');
      return;
    }

    try {
      setIsRefiningDescription(true);
      const refined = await refineWorkDescription({
        text: raw,
        trade: primaryTradeLabel,
      });
      const next =
        refined.length > PREVIOUS_WORK_CAPTION_MAX
          ? refined.slice(0, PREVIOUS_WORK_CAPTION_MAX)
          : refined;
      if (!next) {
        toast.error('AI did not return a refinement. Try again.');
        return;
      }
      setCaption(next);
      toast.success('Description refined.');
    } catch (e) {
      console.error('[works/create] refine description failed', e);
      toast.error(e instanceof Error ? e.message : 'Could not refine description.');
    } finally {
      setIsRefiningDescription(false);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ttl = title.trim();
    if (!ttl) {
      setTitleError('Please add a title.');
      toast.error('Please add a title.');
      return;
    }
    if (ttl.length > PREVIOUS_WORK_TITLE_MAX) {
      setTitleError(`Title must be ${PREVIOUS_WORK_TITLE_MAX} characters or less.`);
      toast.error(`Title must be ${PREVIOUS_WORK_TITLE_MAX} characters or less.`);
      return;
    }
    setTitleError(null);

    const cap = caption.trim();
    if (!cap) {
      toast.error('Please add a description for this project.');
      return;
    }
    if (cap.length > PREVIOUS_WORK_CAPTION_MAX) {
      toast.error(`Description must be ${PREVIOUS_WORK_CAPTION_MAX} characters or less.`);
      return;
    }
    if (location.trim().length > PREVIOUS_WORK_LOCATION_MAX) {
      toast.error(`Location must be ${PREVIOUS_WORK_LOCATION_MAX} characters or less.`);
      return;
    }
    if (files.length === 0) {
      toast.error('Add at least one image (up to 5).');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', ttl);
      fd.append('caption', cap);
      if (location.trim()) fd.append('location', location.trim());
      files.forEach((f) => fd.append('images', f));

      const res = await fetch('/api/profile/previous-work', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Could not publish work.');
        return;
      }
      router.push('/works?created=1');
    } finally {
      setSubmitting(false);
    }
  };

  const heroShell = (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden
      />
      <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
        <img
          src="/TradeHub-Mark-whiteout.svg"
          alt=""
          aria-hidden="true"
          className="h-[1600px] w-[1600px] opacity-[0.08]"
        />
      </div>
    </>
  );

  if (isLoading || !currentUser) {
    return (
      <AppLayout>
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-slate-900">
          {heroShell}
          <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
            <div className="h-10 w-56 animate-pulse rounded-lg bg-white/20" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-slate-900">
        {heroShell}

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
          <PageHeader
            tone="dark"
            backLink={{ href: '/works', label: 'Back to Completed Works' }}
            title="Add completed work"
            description="Share photos of a finished job. Your profile’s primary trade is shown on this post automatically."
          />

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <form onSubmit={submit} className="space-y-6">
              <div>
                <Label htmlFor="cw-title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cw-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  placeholder="e.g. Bathroom Renovation – Richmond"
                  maxLength={PREVIOUS_WORK_TITLE_MAX}
                  className="mt-1"
                />
                {titleError ? <p className="mt-1 text-sm text-red-600">{titleError}</p> : null}
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-600">Trade on this post</p>
                {primaryTradeLabel && TradeIcon ? (
                  <span
                    className={cn(
                      'mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-white px-3 py-1',
                      'text-xs font-semibold text-gray-900 shadow-sm'
                    )}
                  >
                    <TradeIcon className="h-3.5 w-3.5 text-blue-600" aria-hidden />
                    {primaryTradeLabel}
                  </span>
                ) : (
                  <p className="mt-1 text-sm text-amber-800">
                    Add a primary trade in{' '}
                    <Link href="/profile/edit" className="font-medium text-amber-700 underline hover:text-amber-900">
                      Edit profile
                    </Link>{' '}
                    so visitors see your trade on completed works.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-800">Photos</Label>
                <p className="mt-0.5 text-xs text-gray-500">
                  1–5 images — JPEG, PNG, GIF, or WebP, up to 10MB each.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="relative h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:h-28 sm:w-28"
                    >
                      <Image
                        src={previewUrls[i]}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeFileAt(i)}
                        className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
                        aria-label="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {files.length < PREVIOUS_WORK_MAX_IMAGES ? (
                    <label
                      className={cn(
                        'flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300',
                        'bg-gray-50 text-gray-500 transition hover:border-gray-400 hover:bg-gray-100 sm:h-28 sm:w-28'
                      )}
                    >
                      <ImagePlus className="h-7 w-7" aria-hidden />
                      <span className="mt-1 text-[11px] font-medium">Add photos</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        multiple
                        className="hidden"
                        onChange={onPickFiles}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div>
                <Label htmlFor="cw-caption">Description</Label>
                <Textarea
                  id="cw-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What did you complete? Scope, materials, outcome…"
                  rows={6}
                  maxLength={PREVIOUS_WORK_CAPTION_MAX}
                  className="mt-1"
                />
                <div className="mt-2 flex justify-end">
                  <RefinePillButton
                    size="sm"
                    variant="secondary"
                    loading={isRefiningDescription}
                    disabled={!String(caption ?? '').trim()}
                    onClick={refineWorkDescriptionWithAI}
                    title={
                      !String(caption ?? '').trim()
                        ? 'Enter a description first'
                        : 'Refine your existing text (does not invent scope)'
                    }
                  />
                </div>
                <p className="mt-1 text-right text-xs text-gray-500 tabular-nums">
                  {caption.length}/{PREVIOUS_WORK_CAPTION_MAX} characters
                </p>
              </div>

              <SuburbAutocomplete
                value={location}
                postcode={postcode}
                locationLabel="Location (optional)"
                onSuburbChange={(v) => {
                  setLocation(v);
                  setPostcode('');
                  locationExtrasRef.current = { lat: null, lng: null, placeId: null };
                }}
                onPostcodeChange={setPostcode}
                onPlaceIdChange={(id) => {
                  locationExtrasRef.current.placeId = id;
                }}
                onLatLngChange={(lat, lng) => {
                  locationExtrasRef.current.lat = typeof lat === 'number' ? lat : null;
                  locationExtrasRef.current.lng = typeof lng === 'number' ? lng : null;
                }}
              />

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing…
                    </span>
                  ) : (
                    'Publish'
                  )}
                </Button>
                <Link href="/works" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
