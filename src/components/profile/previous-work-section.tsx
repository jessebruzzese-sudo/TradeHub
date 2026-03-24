'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, MapPin, Plus } from 'lucide-react';

import { formatRelativeTime } from '@/lib/completed-work-dates';
import { getTradeIcon } from '@/lib/trade-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PreviousWorkListItem } from '@/lib/previous-work';

const COLLAPSED_VISIBLE = 3;

type Props = {
  userId: string;
  isSelf: boolean;
  primaryTradeLabel: string | null;
};

export function PreviousWorkSection({ userId, isSelf, primaryTradeLabel }: Props) {
  const [items, setItems] = useState<PreviousWorkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/previous-work?userId=${encodeURIComponent(userId)}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItems([]);
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setExpanded(false);
  }, [userId]);

  const hasMoreThanCollapsed = items.length > COLLAPSED_VISIBLE;
  const displayedItems =
    expanded || !hasMoreThanCollapsed ? items : items.slice(0, COLLAPSED_VISIBLE);
  const showViewAll = isSelf && hasMoreThanCollapsed;
  const TradeIcon = primaryTradeLabel ? getTradeIcon(primaryTradeLabel) : null;

  return (
    <section
      className={cn(
        'scroll-mt-24 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-6',
        'mt-3 sm:mt-4',
        'mb-6 sm:mb-8'
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Completed Works</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-[13px]">Photo proof of completed work</p>
        </div>
        {isSelf ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {showViewAll ? (
              <Button variant="ghost" size="sm" className="h-9 text-slate-700" asChild>
                <Link href="/works">View all</Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-slate-300"
            >
              <Link href="/works/create">
                <Plus className="h-4 w-4" aria-hidden />
                Add Work
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100"
              aria-hidden
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className={cn(
            'flex min-h-[11rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200',
            'bg-slate-50/90 px-6 py-12 text-center sm:min-h-[12rem] sm:py-14'
          )}
        >
          <p className="text-base font-semibold tracking-tight text-slate-900 sm:text-[17px]">
            List previous jobs completed
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Showcase your skills</p>
          {isSelf ? (
            <Button
              asChild
              className="mt-6 gap-1.5 rounded-lg border-slate-300"
              variant="outline"
              size="sm"
            >
              <Link href="/works/create">
                <Plus className="h-4 w-4" aria-hidden />
                Add Work
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {displayedItems.map((item) => {
            const cover = item.images[0]?.url;
            const posted = formatRelativeTime(item.created_at);
            return (
              <Link
                key={item.id}
                href={`/works/${item.id}`}
                className={cn(
                  'group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 text-left shadow-sm',
                  'outline-none ring-offset-2 transition duration-200',
                  'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
                  'focus-visible:ring-2 focus-visible:ring-blue-500',
                  'touch-manipulation active:scale-[0.99]'
                )}
              >
                {cover ? (
                  <Image
                    src={cover}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 280px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {primaryTradeLabel && TradeIcon ? (
                      <span
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5',
                          'border border-white/30 bg-black/40 text-[11px] font-semibold text-white backdrop-blur-sm',
                          'shadow-sm'
                        )}
                      >
                        <TradeIcon className="h-3 w-3 shrink-0 text-blue-200" aria-hidden />
                        <span className="truncate">{primaryTradeLabel}</span>
                      </span>
                    ) : null}
                    {item.location ? (
                      <span className="inline-flex max-w-full items-center gap-0.5 truncate rounded-full border border-white/25 bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white/95 backdrop-blur-sm">
                        <MapPin className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                        <span className="truncate">{item.location}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-left text-[13px] font-semibold leading-snug text-white drop-shadow sm:text-sm">
                    {item.title}
                  </p>
                  {posted ? (
                    <p className="mt-1 text-left text-[10px] font-medium leading-snug text-white/65 drop-shadow sm:text-[11px]">
                      Posted {posted}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      'line-clamp-1 text-left text-[10px] font-medium leading-snug text-white/85 drop-shadow sm:text-[11px]',
                      posted ? 'mt-1' : 'mt-0.5'
                    )}
                  >
                    {item.caption}
                  </p>
                </div>
              </Link>
            );
          })}
          </div>
          {hasMoreThanCollapsed ? (
            <div className="mt-3 flex justify-center sm:mt-4">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600',
                  'transition-colors hover:bg-slate-100 hover:text-slate-900',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                )}
              >
                {expanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
