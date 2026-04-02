'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { CompletedWorksGradientShell } from '@/components/works/completed-works-gradient-shell';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { getTradeIcon } from '@/lib/trade-icons';
import { formatPostedDate } from '@/lib/completed-work-dates';
import type { PreviousWorkListItem, PreviousWorkOwnerSummary } from '@/lib/previous-work';
import { cn } from '@/lib/utils';
import { getPublicProfileHref } from '@/lib/url-utils';

export default function CompletedWorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = typeof params?.id === 'string' ? params.id : '';
  const { currentUser } = useAuth();

  const [item, setItem] = useState<PreviousWorkListItem | null>(null);
  const [owner, setOwner] = useState<PreviousWorkOwnerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const load = useCallback(async () => {
    if (!rawId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/profile/previous-work/${encodeURIComponent(rawId)}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotFound(true);
        setItem(null);
        setOwner(null);
        return;
      }
      setItem(data?.item ?? null);
      setOwner(data?.owner ?? null);
      setImgIdx(0);
    } catch {
      setNotFound(true);
      setItem(null);
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  useEffect(() => {
    void load();
  }, [load]);

  const imgs = item?.images ?? [];
  const imgCount = imgs.length;
  const currentUrl = imgs[imgIdx]?.url ?? '';

  const goPrev = useCallback(() => {
    if (imgCount <= 1) return;
    setImgIdx((i) => (i - 1 + imgCount) % imgCount);
  }, [imgCount]);

  const goNext = useCallback(() => {
    if (imgCount <= 1) return;
    setImgIdx((i) => (i + 1) % imgCount);
  }, [imgCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  const primaryTradeLabel = owner?.primaryTrade?.trim() || null;
  const TradeIcon = primaryTradeLabel ? getTradeIcon(primaryTradeLabel) : null;
  const isOwner = !!(currentUser?.id && owner?.id && currentUser.id === owner.id);
  const postedDateLabel = item?.created_at ? formatPostedDate(item.created_at) : null;

  return (
    <AppLayout transparentBackground>
      <CompletedWorksGradientShell className="max-w-4xl">
        <div className="mb-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 gap-1 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-slate-100 sm:aspect-video" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        ) : notFound || !item || !owner ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">Work not found</p>
            <p className="mt-2 text-sm text-slate-600">
              This completed work may have been removed or isn&apos;t visible to you.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className={cn(
                'relative w-full bg-slate-950',
                imgCount > 1 ? 'min-h-[min(70vh,560px)] pb-12 sm:pb-0' : 'min-h-[min(56vw,420px)] sm:min-h-[440px]'
              )}
            >
              {currentUrl ? (
                <Image
                  src={currentUrl}
                  alt={item.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                  unoptimized
                  priority
                />
              ) : null}
              {imgCount > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-md backdrop-blur-sm transition hover:bg-black/75"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-md backdrop-blur-sm transition hover:bg-black/75"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-2 px-3 sm:bottom-4">
                    <p className="rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-white/95 backdrop-blur-sm">
                      {imgIdx + 1} / {imgCount}
                    </p>
                    <div className="flex max-w-full justify-center gap-1.5 overflow-x-auto pb-0.5">
                      {imgs.map((im, i) => (
                        <button
                          key={im.id}
                          type="button"
                          onClick={() => setImgIdx(i)}
                          className={cn(
                            'h-2 shrink-0 rounded-full transition-all',
                            i === imgIdx ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'
                          )}
                          aria-label={`Show image ${i + 1} of ${imgCount}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="border-t border-slate-100 p-5 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {item.title}
                    </h1>
                    {postedDateLabel ? (
                      <p className="mt-1.5 text-sm text-slate-500">Posted {postedDateLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryTradeLabel && TradeIcon ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-gradient-to-r from-blue-50 to-slate-50',
                          'px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm'
                        )}
                      >
                        <TradeIcon className="h-3.5 w-3.5 text-blue-600" aria-hidden />
                        {primaryTradeLabel}
                      </span>
                    ) : null}
                    {item.location ? (
                      <span className="inline-flex max-w-full items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{item.location}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[15px] leading-relaxed text-slate-800 sm:text-base sm:leading-relaxed">
                    {item.caption}
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:max-w-xs sm:w-72">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Posted by
                  </p>
                  <Link
                    href={getPublicProfileHref(owner.id)}
                    className="mt-3 flex items-center gap-3 rounded-lg transition hover:bg-white/80"
                  >
                    <UserAvatar avatarUrl={owner.avatar} userName={owner.displayName} size="lg" />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-slate-900">{owner.displayName}</p>
                      {primaryTradeLabel ? (
                        <p className="truncate text-xs text-slate-500">{primaryTradeLabel}</p>
                      ) : null}
                    </div>
                  </Link>
                  {isOwner ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href="/works">Manage works</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        )}
      </CompletedWorksGradientShell>
    </AppLayout>
  );
}
