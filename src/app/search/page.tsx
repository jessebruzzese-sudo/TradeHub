'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';
import { MapPin, Search as SearchIcon } from 'lucide-react';

type DirectoryUser = {
  id: string;
  name?: string | null;
  business_name?: string | null;
  role?: string | null;
  trades?: string[] | null;
  location?: string | null;
  postcode?: string | null;
  avatar?: string | null;
  cover_url?: string | null;
  mini_bio?: string | null;
  rating?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  up_count?: number | null;
  down_count?: number | null;
  reliability_rating?: number | null;

  abn_status?: string | null;
  abn_verified_at?: string | null;

  premium_now?: boolean | null;
  premium_expires_at?: string | null;
};

function norm(v?: string | null) {
  return String(v || '').trim();
}

function prettyTrade(t: string) {
  return t
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normTrade(v?: string | null) {
  return String(v ?? '').trim().toLowerCase();
}

function isVerified(u: DirectoryUser) {
  const s = String((u as any).abn_status || '').toUpperCase();
  return s === 'VERIFIED' || !!(u as any).abn_verified_at;
}

function isPremium(u: DirectoryUser) {
  return !!(u as any).premium_now;
}

function getDistanceKm(u: any): number | null {
  const v = u?.distance_km ?? u?.distanceKm ?? u?.distance ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function scoreUser(u: any) {
  const avg = Number((u as any).rating_avg ?? 0);
  const count = Number((u as any).rating_count ?? 0);
  const weightedScore = avg * Math.log10(count + 1);
  return weightedScore;
}

function starsFromRating(r?: number | null) {
  const v = Math.max(0, Math.min(5, Number(r ?? 0)));
  const full = Math.floor(v);
  const half = v - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return { v, full, half, empty };
}

export default function SearchDirectoryPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [q, setQ] = useState('');
  const [trade, setTrade] = useState<string>('all');
  const [sort, setSort] = useState<
    'recommended' | 'premium' | 'rating' | 'nearest' | 'name'
  >('recommended');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        let query = (supabase as any)
          .from('public_profile_directory_with_ratings')
          .select(
  `id,
   name,
   role,
   avatar,
   cover_url,
   business_name,
   trades,
   location,
   postcode,
   mini_bio,
   rating,
   rating_avg,
   rating_count,
   up_count,
   down_count,
   reliability_rating,
   abn_status,
   abn_verified_at,
   premium_now,
   premium_expires_at`
          )
          .eq('is_public_profile', true)
          .neq('role', 'admin')
          .order('business_name', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;
        if (!cancelled) setUsers(((data as unknown) as DirectoryUser[]) || []);
      } catch (e) {
        console.error('Search directory load failed', e);
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const allTrades = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      for (const t of u.trades || []) {
        if (t) set.add(t);
      }
    }
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [users]);

  const filtered = useMemo(() => {
    const queryText = q.trim().toLowerCase();
    const tradeNorm = trade === 'all' ? '' : normTrade(trade);

    return users.filter((u) => {
      if (verifiedOnly && !isVerified(u)) return false;

      const name = norm(u.business_name || u.name).toLowerCase();
      const loc = norm(u.location || '').toLowerCase();
      const postcode = norm(u.postcode || '').toLowerCase();
      const tradesRaw = (u.trades || []).map((t) => String(t));
      const tradesNorm = tradesRaw.map((t) => normTrade(t));

      const matchesText =
        !queryText ||
        name.includes(queryText) ||
        loc.includes(queryText) ||
        postcode.includes(queryText) ||
        tradesNorm.some((t) => t.includes(queryText));

      const matchesTrade = !tradeNorm || tradesNorm.some((t) => t === tradeNorm);

      return matchesText && matchesTrade;
    });
  }, [users, q, trade, verifiedOnly]);

  const ranked = useMemo(() => {
    const list = [...filtered];

    if (sort === 'premium') {
      // Premium first, then verified, then rating, then name
      list.sort((a, b) => {
        const pa = isPremium(a) ? 1 : 0;
        const pb = isPremium(b) ? 1 : 0;
        if (pb !== pa) return pb - pa;

        const va = isVerified(a) ? 1 : 0;
        const vb = isVerified(b) ? 1 : 0;
        if (vb !== va) return vb - va;

        const ra = Number((a as any).rating_avg ?? a.rating ?? 0);
        const rb = Number((b as any).rating_avg ?? b.rating ?? 0);
        if (rb !== ra) return rb - ra;

        return String(a.business_name || a.name || '').localeCompare(
          String(b.business_name || b.name || '')
        );
      });
      return list;
    }

    if (sort === 'nearest') {
      // Works later when you add distance_km to the view
      list.sort((a, b) => {
        const da = getDistanceKm(a);
        const db = getDistanceKm(b);

        // Put unknown distances last
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;

        return da - db;
      });
      return list;
    }

    if (sort === 'rating') {
      list.sort((a, b) => Number((b as any).rating_avg ?? b.rating ?? 0) - Number((a as any).rating_avg ?? a.rating ?? 0));
      return list;
    }

    if (sort === 'name') {
      list.sort((a, b) =>
        String(a.business_name || a.name || '').localeCompare(
          String(b.business_name || b.name || '')
        )
      );
      return list;
    }

    // recommended
    list.sort((a, b) => scoreUser(b) - scoreUser(a));
    return list;
  }, [filtered, sort]);

  return (
    <AppLayout>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <img
          src="/TradeHub-Mark-blackout.svg"
          alt=""
          className="pointer-events-none absolute bottom-[-200px] right-[-200px] h-[1600px] w-[1600px] opacity-[0.04]"
        />

        <div className="relative min-h-screen w-full px-4 py-8">
          <PageHeader
            title="Search"
            description="Browse public profiles by trade and location."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, trade, or suburb…"
                  className="h-11 rounded-2xl pl-9 bg-white/90"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-800 shadow-sm"
              >
                {allTrades.map((t) => (
                  <option key={t} value={t}>
                    {t === 'all' ? 'All trades' : prettyTrade(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 h-11 shadow-sm">
              <span className="text-sm text-slate-700 font-medium">Verified only</span>
              <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
            </div>

            <div className="md:col-span-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-800 shadow-sm"
              >
                <option value="recommended">Recommended</option>
                <option value="premium">Premium first</option>
                <option value="rating">Highest rating</option>
                <option value="nearest">Nearest</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="text-sm text-slate-600">Loading directory…</div>
            ) : ranked.length === 0 ? (
              <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-900">
                    No profiles found
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Try a different trade or broaden your search.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="px-4 pb-24 pt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {ranked.map((u) => {
                  const loc = u.location;

                  return (
                    <Link
                      key={u.id}
                      href={`/profile/${u.id}`}
                      className={cn(
                        "group block w-full h-full relative overflow-hidden rounded-2xl border bg-white",
                        "shadow-[0_1px_0_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.08)]",
                        "transition-all duration-200",
                        "hover:-translate-y-[1px] hover:shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_30px_rgba(15,23,42,0.12)]",
                        "active:translate-y-0 active:shadow-[0_1px_0_rgba(15,23,42,0.06),0_6px_16px_rgba(15,23,42,0.10)]"
                      )}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-50/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <div
                        className={cn(
                          "pointer-events-none absolute left-0 top-0 h-full w-1",
                          isPremium(u)
                            ? "bg-gradient-to-b from-amber-300 to-amber-500"
                            : isVerified(u)
                            ? "bg-gradient-to-b from-blue-400 to-blue-600"
                            : "bg-slate-200"
                        )}
                      />
                      <div className="relative p-4">
                        <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={`${u.business_name || u.name || 'User'} avatar`}
                              className="h-11 w-11 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
                              {(u.business_name || u.name || '?')
                                .trim()
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[15px] font-semibold text-slate-900 leading-tight truncate">
                                {u.business_name || u.name || 'Business'}
                              </div>
                            </div>
                          </div>

                          {loc && (
                            <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{loc}</span>
                            </div>
                          )}

                          {(() => {
                            const avg = Number((u as any).rating_avg ?? u.rating ?? 0);
                            const count = Number((u as any).rating_count ?? 0);
                            if (avg === 0 && count === 0) return null;
                            const s = starsFromRating(avg);
                            return (
                              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: s.full }).map((_, i) => (
                                    <span key={'f'+i}>★</span>
                                  ))}
                                  {s.half === 1 && <span>☆</span>}
                                  {Array.from({ length: s.empty }).map((_, i) => (
                                    <span key={'e'+i}>☆</span>
                                  ))}
                                </div>
                                <span className="font-semibold">{avg.toFixed(1)}</span>
                                {count > 0 && (
                                  <span className="text-slate-500">({count})</span>
                                )}
                              </div>
                            );
                          })()}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {(u.trades || []).slice(0, 5).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {prettyTrade(t)}
                              </span>
                            ))}
                            {(u.trades || []).length > 5 && (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                +{(u.trades || []).length - 5}
                              </span>
                            )}
                            {isVerified(u) && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                Verified
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          View
                        </Button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
