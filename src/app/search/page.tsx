'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { hasValidABN } from '@/lib/abn-utils';
import { MapPin, Search as SearchIcon, MessageSquare, Crown } from 'lucide-react';
import ProfileSummaryTrustBar from '@/components/profile/ProfileSummaryTrustBar';
import { formatProfilePricingTypeLabel } from '@/lib/job-pay-labels';

type DirectoryUser = {
  id: string;
  name?: string | null;
  business_name?: string | null;
  role?: string | null;
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
  primary_trade?: string | null;
  additional_trades?: unknown;
  is_public_profile?: boolean | null;
  subscription_status?: string | null;
  premium_until?: string | null;
  complimentary_premium_until?: string | null;

  abn_status?: string | null;
  abn_verified_at?: string | null;

  premium_now?: boolean | null;
  premium_expires_at?: string | null;

  pricing_type?: string | null;
  pricing_amount?: number | null;
  show_pricing_in_listings?: boolean | null;

  profile_strength_score?: number | null;
  completed_jobs?: number | null;
  /** Aliases from `/api/discovery/search` (optional). */
  average_rating?: number | null;
  review_count?: number | null;
  reliability_percent?: number | null;
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

function getNormalizedUserTrades(u: DirectoryUser): string[] {
  const primary = typeof u.primary_trade === 'string' ? u.primary_trade.trim() : '';
  const additional = Array.isArray(u.additional_trades)
    ? (u.additional_trades as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const merged = [...(primary ? [primary] : []), ...additional];
  return Array.from(new Set(merged));
}

function isVerified(u: DirectoryUser) {
  return hasValidABN(u as any);
}

function isPremium(u: DirectoryUser) {
  return !!(u as any).premium_now;
}

/** Premium-first sort weight: 1 for premium, 0 for free. Sort desc for premium first. */
function getPremiumSortWeight(u: DirectoryUser): number {
  return isPremium(u) ? 1 : 0;
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

function reliabilityToPercentSearch(r?: number | null): number | null {
  if (r == null || !Number.isFinite(Number(r))) return null;
  const v = Number(r);
  if (v <= 5) return Math.round((v / 5) * 100);
  return Math.round(Math.min(100, v));
}

export default function SearchDirectoryPage() {
  const router = useRouter();
  const store = useMemo(() => getStore(), []);
  const { currentUser } = useAuth();
  const DEBUG = process.env.NEXT_PUBLIC_DISCOVERY_DEBUG === '1';
  const DEBUG_RUN_ID = 'search-debug-run';

  function dbg(..._args: unknown[]) {
    // disabled for now
  }

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
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
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[search] load:start', { q, trade, verifiedOnly, retryKey, currentUserId: currentUser?.id });
        }
        dbg('H4-cache-or-wrong-route', 'load:start', { q, trade, verifiedOnly, retryKey, currentUserId: currentUser?.id ?? null });
        setLoading(true);
        setLoadError(null);

        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (trade !== 'all') params.set('trade', trade);
        if (verifiedOnly) params.set('verifiedOnly', 'true');
        // Avoid any stale caching while debugging.
        if (DEBUG) params.set('_debugTs', String(Date.now()));
        const url = `/api/discovery/search?${params}`;
        dbg('H4-cache-or-wrong-route', 'fetch:request', { url });
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Sign in to search');
          throw new Error('Failed to load');
        }
        const data = await res.json();
        dbg('H1-api-returning-empty', 'fetch:response', {
          url,
          status: res.status,
          profilesCount: Array.isArray(data?.profiles) ? data.profiles.length : null,
        });
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[search] api:response', {
            url,
            status: res.status,
            profilesCount: Array.isArray(data?.profiles) ? data.profiles.length : null,
            sampleProfiles: Array.isArray(data?.profiles) ? data.profiles.slice(0, 3) : null,
          });
        }
        if (cancelled) return;
        setUsers((data.profiles ?? []) as DirectoryUser[]);
      } catch (e) {
        console.error('Search directory load failed', e);
        if (!cancelled) {
          setUsers([]);
          setLoadError(
            e instanceof Error ? e.message : 'Unable to load profiles. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [retryKey, q, trade, verifiedOnly]);

  const allTrades = useMemo(() => {
    const options = Array.from(
      new Set(
        users
          .filter((u) => u.is_public_profile === true)
          .flatMap((u) => getNormalizedUserTrades(u))
      )
    ).sort((a, b) => a.localeCompare(b));
    const finalOptions = ['all', ...options];
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[search] trades:options', {
        usersCount: users.length,
        publicUsersCount: users.filter((u) => u.is_public_profile === true).length,
        finalOptions,
      });
    }
    dbg('H2-client-filtering', 'trades:options', {
      usersCount: users.length,
      publicUsersCount: users.filter((u) => u.is_public_profile === true).length,
      tradesCount: finalOptions.length,
      tradesSample: finalOptions.slice(0, 12),
    });
    return finalOptions;
  }, [users]);

  const filtered = useMemo(() => {
    const queryText = q.trim().toLowerCase();
    const tradeNorm = trade === 'all' ? '' : normTrade(trade);

    const result = users.filter((u) => {
      if (verifiedOnly && !isVerified(u)) return false;

      const name = norm(u.business_name || u.name).toLowerCase();
      const loc = norm(u.location || '').toLowerCase();
      const postcode = norm(u.postcode || '').toLowerCase();
      const tradesRaw = getNormalizedUserTrades(u);
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
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[search] profiles:filtered', {
        usersCount: users.length,
        filteredCount: result.length,
        queryText,
        trade,
        verifiedOnly,
        sampleFiltered: result.slice(0, 3),
      });
    }
    dbg('H2-client-filtering', 'profiles:filtered', {
      usersCount: users.length,
      filteredCount: result.length,
      queryText,
      trade,
      verifiedOnly,
    });
    return result;
  }, [users, q, trade, verifiedOnly]);

  const ranked = useMemo(() => {
    const list = [...filtered];

    /** Premium users always rank above Free within the eligible result set. */
    const premiumFirst = (a: DirectoryUser, b: DirectoryUser) => {
      const pa = getPremiumSortWeight(a);
      const pb = getPremiumSortWeight(b);
      if (pb !== pa) return pb - pa;
      return 0;
    };

    if (sort === 'premium') {
      // Premium first, then verified, then rating, then name
      list.sort((a, b) => {
        const pf = premiumFirst(a, b);
        if (pf !== 0) return pf;

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
      list.sort((a, b) => {
        const pf = premiumFirst(a, b);
        if (pf !== 0) return pf;

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
      list.sort((a, b) => {
        const pf = premiumFirst(a, b);
        if (pf !== 0) return pf;
        return Number((b as any).rating_avg ?? b.rating ?? 0) - Number((a as any).rating_avg ?? a.rating ?? 0);
      });
      return list;
    }

    if (sort === 'name') {
      list.sort((a, b) => {
        const pf = premiumFirst(a, b);
        if (pf !== 0) return pf;
        return String(a.business_name || a.name || '').localeCompare(
          String(b.business_name || b.name || '')
        );
      });
      return list;
    }

    // recommended: premium first, then existing recommended score
    list.sort((a, b) => {
      const pf = premiumFirst(a, b);
      if (pf !== 0) return pf;
      return scoreUser(b) - scoreUser(a);
    });
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
            ) : loadError ? (
              <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-900">
                    Failed to load profiles
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => setRetryKey((k) => k + 1)}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    Try again
                  </button>
                </CardContent>
              </Card>
            ) : ranked.length === 0 ? (
              <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-900">
                    No profiles found
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
              <div className="px-4 pb-24 pt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {ranked.map((u) => {
                  const loc = u.location;
                  const premium = isPremium(u);
                  const userTrades = getNormalizedUserTrades(u);

                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "group block w-full h-full relative overflow-hidden rounded-2xl border",
                        "transition-all duration-200 active:translate-y-0",
                        premium
                          ? "bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 border-amber-200/70 shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_10px_30px_rgba(245,158,11,0.10)] hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(251,191,36,0.14),0_16px_40px_rgba(245,158,11,0.14)] active:shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_10px_30px_rgba(245,158,11,0.10)]"
                          : "bg-white border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-[1px] hover:shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_30px_rgba(15,23,42,0.12)] active:shadow-[0_1px_0_rgba(15,23,42,0.06),0_6px_16px_rgba(15,23,42,0.10)]"
                      )}
                    >
                      {premium && (
                        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-200/20 blur-2xl" aria-hidden />
                      )}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-50/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <div
                        className={cn(
                          "pointer-events-none absolute left-0 top-0 h-full rounded-l-2xl",
                          premium
                            ? "w-[5px] bg-gradient-to-b from-amber-400 via-orange-400 to-amber-500"
                            : isVerified(u)
                            ? "w-1 bg-gradient-to-b from-blue-400 to-blue-600"
                            : "w-1 bg-slate-200"
                        )}
                      />
                      {premium && (
                        <span
                          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                          aria-hidden
                        >
                          <span
                            className="premium-shimmer-band absolute top-0 left-[-30%] h-full w-[35%] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            style={{ transform: 'translateX(-140%) skewX(-18deg)' }}
                          />
                        </span>
                      )}
                      <div className="relative z-10 p-4">
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
                            <div className="min-w-0 flex flex-wrap items-center gap-2">
                              <Link href={`/profile/${u.id}`} className="block">
                                <div
                                  className={cn(
                                    "text-[15px] leading-tight truncate hover:text-blue-600",
                                    premium ? "font-bold text-slate-950" : "font-semibold text-slate-900"
                                  )}
                                >
                                  {u.business_name || u.name || 'Business'}
                                </div>
                              </Link>
                              {premium && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-[3px] text-xs font-medium text-amber-700">
                                  <Crown className="h-3 w-3 shrink-0" />
                                  Premium
                                </span>
                              )}
                            </div>
                          </div>
                          {premium && (
                            <p className="mt-0.5 text-[11px] text-amber-600/80 hidden sm:block">
                              Priority profile
                            </p>
                          )}

                          {loc && (
                            <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{loc}</span>
                            </div>
                          )}

                          {(() => {
                            const avg = Number(
                              (u as any).average_rating ?? (u as any).rating_avg ?? u.rating ?? 0
                            );
                            const count = Number((u as any).review_count ?? (u as any).rating_count ?? 0);
                            const relPct =
                              (u as any).reliability_percent != null &&
                              !Number.isNaN(Number((u as any).reliability_percent))
                                ? Number((u as any).reliability_percent)
                                : reliabilityToPercentSearch((u as any).reliability_rating);
                            const str = (u as any).profile_strength_score;
                            const strengthPct =
                              str != null && str !== '' && !Number.isNaN(Number(str)) ? Number(str) : null;
                            const showRating = count > 0 || avg > 0;
                            if (!showRating && relPct == null && strengthPct == null) return null;
                            return (
                              <div className="mt-2">
                                <ProfileSummaryTrustBar
                                  rating={showRating ? avg : undefined}
                                  reviewCount={showRating ? count : undefined}
                                  reliabilityPercent={relPct}
                                  profileStrengthScore={strengthPct}
                                />
                              </div>
                            );
                          })()}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {userTrades.slice(0, 5).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {prettyTrade(t)}
                              </span>
                            ))}
                            {userTrades.length > 5 && (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                +{userTrades.length - 5}
                              </span>
                            )}
                            {isVerified(u) && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                Verified
                              </span>
                            )}
                            {(() => {
                              if (!(u as any).show_pricing_in_listings) return null;
                              const pt = (u as any).pricing_type;
                              const pa = (u as any).pricing_amount != null ? Number((u as any).pricing_amount) : null;
                              let label: string | null = null;
                              if (pt === 'hourly' && pa != null && pa > 0) label = `$${pa}/hr`;
                              else if (pt === 'from_hourly' && pa != null && pa > 0) label = `From $${pa}/hr`;
                              else if (pt === 'day' && pa != null && pa > 0) label = `$${pa}/day`;
                              else if (pt === 'day') label = 'Day rate';
                              else if (pt === 'quote_on_request') label = formatProfilePricingTypeLabel('quote_on_request');
                              if (!label) return null;
                              return (
                                <span className="text-xs text-slate-600">
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${u.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 rounded-full opacity-0 group-hover:opacity-100 transition",
                                premium && "shadow-sm hover:shadow border-slate-200"
                              )}
                            >
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 rounded-full opacity-0 group-hover:opacity-100 transition gap-1.5",
                              premium && "shadow-sm hover:shadow border-slate-200"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              store.ensureUserInStore({
                                id: u.id,
                                name: (u.business_name || u.name || 'User') ?? undefined,
                                avatar: u.avatar ?? undefined,
                              });
                              router.push(`/messages?userId=${u.id}`);
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Message
                          </Button>
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
