'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/app-nav';
import { CompletedWorksGradientShell } from '@/components/works/completed-works-gradient-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';
import { getTradeIcon } from '@/lib/trade-icons';
import { formatRelativeTime } from '@/lib/completed-work-dates';
import type { PreviousWorkListItem } from '@/lib/previous-work';
import { cn } from '@/lib/utils';

export default function CompletedWorksIndexPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PreviousWorkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PreviousWorkListItem | null>(null);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/works')}`);
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (searchParams.get('created') !== '1') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    toast.success('Work added successfully');
    router.replace('/works', { scroll: false });
  }, [searchParams, router]);

  const primaryTradeLabel =
    (currentUser?.primaryTrade && String(currentUser.primaryTrade).trim()) || null;
  const TradeIcon = primaryTradeLabel ? getTradeIcon(primaryTradeLabel) : null;

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/profile/previous-work?userId=${encodeURIComponent(currentUser.id)}`,
        { credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItems([]);
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) void load();
  }, [load, currentUser?.id]);

  const confirmDelete = async () => {
    const id = deleteTarget?.id;
    if (!id) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/profile/previous-work/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Could not remove work.');
        return;
      }
      toast.success('Completed work removed');
      setItems((prev) => prev.filter((x) => x.id !== id));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <AppLayout transparentBackground>
        <CompletedWorksGradientShell className="max-w-5xl">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-white/20" />
        </CompletedWorksGradientShell>
      </AppLayout>
    );
  }

  return (
    <AppLayout transparentBackground>
      <CompletedWorksGradientShell className="max-w-5xl">
        <PageHeader
          tone="dark"
          backLink={{ href: '/dashboard' }}
          title="Completed Works"
          description="Showcase finished jobs with photos and a short description. Your primary trade from your profile is shown automatically — there is no separate trade field per post."
          action={
            <Button
              asChild
              className="gap-1.5 rounded-lg bg-white text-blue-700 shadow-sm hover:bg-blue-50"
            >
              <Link href="/works/create">
                <Plus className="h-4 w-4" aria-hidden />
                Add Work
              </Link>
            </Button>
          }
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/15" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className={cn(
              'flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-white/40',
              'bg-white/90 p-8 text-center'
            )}
            style={{
              boxShadow:
                'inset 0 1px 2px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.08)',
            }}
          >
            <p className="text-lg font-semibold tracking-tight text-slate-900">No completed works yet</p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Showcase work to increase trust with other users.
            </p>
            <Button asChild className="mt-6 gap-1.5 rounded-lg">
              <Link href="/works/create">
                <Plus className="h-4 w-4" aria-hidden />
                Add your first work
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const cover = item.images[0]?.url;
              const posted = formatRelativeTime(item.created_at);
              return (
                <li key={item.id}>
                  <div
                    className={cn(
                      'group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition',
                      'hover:border-slate-300 hover:shadow-md'
                    )}
                  >
                    <Link
                      href={`/works/${item.id}`}
                      className="relative block aspect-[4/3] w-full bg-slate-100"
                    >
                      {cover ? (
                        <Image
                          src={cover}
                          alt={item.title}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(max-width: 640px) 100vw, 50vw"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {primaryTradeLabel && TradeIcon ? (
                            <span
                              className={cn(
                                'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5',
                                'border border-white/30 bg-black/45 text-[11px] font-semibold text-white backdrop-blur-sm'
                              )}
                            >
                              <TradeIcon className="h-3 w-3 shrink-0 text-blue-200" aria-hidden />
                              <span className="truncate">{primaryTradeLabel}</span>
                            </span>
                          ) : null}
                          {item.location ? (
                            <span className="inline-flex max-w-full items-center gap-0.5 truncate rounded-full border border-white/25 bg-black/35 px-2 py-0.5 text-[10px] font-medium text-white/95 backdrop-blur-sm">
                              <MapPin className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                              <span className="truncate">{item.location}</span>
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-left text-base font-semibold leading-snug text-white drop-shadow">
                          {item.title}
                        </p>
                        {posted ? (
                          <p className="mt-1 text-left text-[11px] font-medium leading-snug text-white/70 drop-shadow">
                            Posted {posted}
                          </p>
                        ) : null}
                        <p className="mt-1 line-clamp-1 text-left text-xs font-medium leading-snug text-white/90 drop-shadow">
                          {item.caption}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={deletingId === item.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CompletedWorksGradientShell>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this completed work?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>Photos and the description will be removed from your profile. You can&apos;t undo this.</span>
              {deleteTarget?.title ? (
                <span className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-900">
                  {deleteTarget.title}
                </span>
              ) : null}
              {deleteTarget?.caption ? (
                <span className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 line-clamp-3">
                  {deleteTarget.caption}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deletingId ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
