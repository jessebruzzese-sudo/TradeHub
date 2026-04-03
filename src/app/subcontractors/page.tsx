// @ts-nocheck
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { useAuth } from '@/lib/auth';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getTradeIcon } from '@/lib/trade-icons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Lightbulb, Users, ArrowLeft, MapPin, BadgeCheck, Crown, ArrowRight, Calendar } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { useActiveTradesCatalog } from '@/lib/trades/use-active-trades-catalog';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';
import { getPublicProfileHref } from '@/lib/url-utils';
import { debugProfileCardData } from '@/lib/profile-debug';
import { format } from 'date-fns';

type ProfileCard = {
  id: string;
  display_name: string;
  business_name: string | null;
  suburb: string | null;
  trade_categories: string[];
  is_verified: boolean;
  avatar_url: string | null;
  isPremium?: boolean;
};

/** Display order for empty-state chips; labels must exist in `public.trades` / `/api/trades`. */
const POPULAR_TRADE_ORDER = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Concreting',
  'Painting & Decorating',
] as const;

const SORT_OPTIONS = [
  { value: 'distance-closest', label: 'Distance: Closest' },
  { value: 'distance-furthest', label: 'Distance: Furthest' },
  { value: 'price-highest', label: 'Price: Highest' },
  { value: 'price-lowest', label: 'Price: Lowest' },
  { value: 'rating-highest', label: 'Rating: Highest' },
  { value: 'rating-lowest', label: 'Rating: Lowest' },
] as const;

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'abn-verified', label: 'ABN verified only' },
] as const;

function SubcontractorCard({ sub }: { sub: ProfileCard }) {
  debugProfileCardData('subcontractors', sub as unknown as Record<string, unknown>);
  const primaryTrade = sub.trade_categories[0] ?? null;
  const TradeIcon = primaryTrade ? getTradeIcon(primaryTrade) : null;
  const displayName = sub.business_name ?? sub.display_name;
  const premium = sub.isPremium ?? false;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-200",
        premium
          ? "bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 border-amber-200/70 shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_10px_30px_rgba(245,158,11,0.10)] hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(251,191,36,0.14),0_16px_40px_rgba(245,158,11,0.14)]"
          : "bg-white border-slate-200 shadow-sm hover:shadow-md"
      )}
    >
      {premium && (
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-200/20 blur-2xl" aria-hidden />
      )}
      {premium && (
        <div className="pointer-events-none absolute left-0 top-0 h-full w-[5px] rounded-l-xl bg-gradient-to-b from-amber-400 via-orange-400 to-amber-500" />
      )}
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
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <UserAvatar
            avatarUrl={sub.avatar_url}
            userName={displayName}
            size="lg"
            className="h-12 w-12 shrink-0 ring-2 ring-slate-100"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn(premium ? "font-bold text-slate-950" : "font-semibold text-slate-900")}>
                {displayName}
              </h3>
              {sub.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  ABN verified
                </span>
              )}
              {sub.isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-[3px] text-xs font-medium text-amber-700">
                  <Crown className="h-3.5 w-3.5 shrink-0" />
                  Premium
                </span>
              )}
            </div>
            {premium && (
              <p className="mt-0.5 text-[11px] text-amber-600/80 hidden sm:block">
                Priority profile
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              {TradeIcon ? <TradeIcon className="h-4 w-4 text-blue-600" /> : null}
              <span>{primaryTrade ?? 'Trade professional'}</span>
            </div>
            {sub.suburb && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="h-4 w-4 flex-shrink-0 text-sky-600" />
                {sub.suburb}
              </div>
            )}
          </div>
        </div>
        <Link href={getPublicProfileHref(sub.id)} className="shrink-0">
          <Button
            size="sm"
            variant="outline"
            className={cn("gap-2", premium && "shadow-sm hover:shadow border-slate-200")}
          >
            View profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function SubcontractorsPage() {
  const { currentUser, isLoading } = useAuth();
  const { names: catalogTradeNames } = useActiveTradesCatalog();
  const popularTradesForChips = useMemo(
    () => POPULAR_TRADE_ORDER.filter((t) => catalogTradeNames.includes(t)),
    [catalogTradeNames]
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('distance-closest');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [availLoading, setAvailLoading] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<Date | null>(null);
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [outsideRadiusCount, setOutsideRadiusCount] = useState(0);
  const [allowedRadiusKm, setAllowedRadiusKm] = useState(20);

  const nextAvailableLabel = useMemo(() => {
    if (!nextAvailable) return null;
    return format(nextAvailable, 'EEE d MMM');
  }, [nextAvailable]);

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
  const primaryTrade = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade ?? null;

  // Free users: locked to primary trade only. Premium: can browse across trades.
  const effectiveTrade = isPremium ? selectedTrade : (primaryTrade || 'all');
  const tradeDisplayValue = isPremium ? selectedTrade : (primaryTrade || 'All Trades');
  const TradeIcon = getTradeIcon(primaryTrade || undefined);

  // `/api/discovery/trade/*` returns only users with active listed availability (subcontractor_availability, today+), not every public profile.
  useEffect(() => {
    if (!currentUser?.id) {
      setProfiles([]);
      setProfilesLoading(false);
      return;
    }
    setProfilesLoading(true);
    setProfilesError(null);
    const tradeParam = effectiveTrade === 'all' ? 'all' : effectiveTrade;
    fetch(`/api/discovery/trade/${encodeURIComponent(tradeParam)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          stage?: string;
          profiles?: ProfileCard[];
          outsideRadiusCount?: number;
          allowedRadiusKm?: number;
        };
        if (!res.ok) {
          if (res.status === 401) throw new Error('Sign in to view subcontractors');
          const msg = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : 'Failed to load';
          const stage = typeof data.stage === 'string' && data.stage.trim() ? data.stage.trim() : '';
          throw new Error(stage ? `${msg} (${stage})` : msg);
        }
        return data;
      })
      .then((data) => {
        setProfiles(data.profiles ?? []);
        setOutsideRadiusCount(data.outsideRadiusCount ?? 0);
        setAllowedRadiusKm(data.allowedRadiusKm ?? 20);
      })
      .catch((e) => {
        setProfilesError(e instanceof Error ? e.message : 'Failed to load');
        setProfiles([]);
      })
      .finally(() => setProfilesLoading(false));
  }, [currentUser?.id, effectiveTrade]);

  // Client-side filter (search, ABN verified) and sort
  // Premium users always rank above Free within the eligible result set.
  const filteredResults = useMemo(() => {
    let list = [...profiles];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.business_name ?? '').toLowerCase().includes(q) ||
          (s.display_name ?? '').toLowerCase().includes(q)
      );
    }

    if (filterBy === 'abn-verified') {
      list = list.filter((s) => s.is_verified);
    }

    list.sort((a, b) => {
      // Premium first, then existing sort logic
      const pa = a.isPremium ? 1 : 0;
      const pb = b.isPremium ? 1 : 0;
      if (pb !== pa) return pb - pa;

      const nameA = (a.business_name ?? a.display_name ?? '').toLowerCase();
      const nameB = (b.business_name ?? b.display_name ?? '').toLowerCase();
      switch (sortBy) {
        case 'rating-highest':
        case 'rating-lowest':
        case 'price-highest':
        case 'price-lowest':
        case 'distance-closest':
        case 'distance-furthest':
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return list;
  }, [profiles, searchQuery, filterBy, sortBy]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!currentUser?.id) {
        setNextAvailable(null);
        return;
      }

      setAvailLoading(true);

      try {
        const supabase = getBrowserSupabase();
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        const { data, error } = await supabase
          .from('subcontractor_availability')
          .select('date')
          .eq('user_id', currentUser.id)
          .gte('date', todayStr)
          .order('date', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const first = data?.[0]?.date ? new Date(data[0].date) : null;
        setNextAvailable(first);
      } catch (err) {
        console.error('[subcontractors] availability load failed', err);
        if (!cancelled) setNextAvailable(null);
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
          Loading…
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  return (
    <TradeGate>
      <AppLayout transparentBackground>
        {/* Blue wrapper (marketing layout) */}
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
          {/* Dotted overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
            aria-hidden
          />

          {/* White watermark (TradeHub logo) */}
          <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
            <img
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              aria-hidden="true"
              className="h-[1600px] w-[1600px] opacity-[0.08]"
            />
          </div>

          {/* Page content — same structure as /jobs */}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {/* Header row — same rhythm as /jobs */}
            <div className="mb-4 flex flex-col gap-2 sm:mb-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors mb-1"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 shadow-sm ring-1 ring-white/15 backdrop-blur">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Find Subcontractors</h1>
                  </div>
                  <p className="mt-1 text-sm text-white/80">
                    Subcontractors who have listed availability — browse by trade and connect
                  </p>
                </div>

                <div className="flex flex-col items-stretch sm:items-end">
                  {nextAvailableLabel && (
                    <div className="mb-2 text-right">
                      <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        Available {nextAvailableLabel}
                      </div>
                    </div>
                  )}

                  <Button
                    asChild
                    className="h-10 rounded-full gap-2 px-5 shadow-md hover:shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all"
                  >
                    <Link href="/profile/availability" className="flex items-center gap-2">
                      {!nextAvailableLabel && !availLoading && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                      )}
                      <Calendar className="h-4 w-4" />
                      {nextAvailableLabel ? 'Update availability' : 'List availability'}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Main surface — same Card structure as /jobs */}
            <Card className="border-white/15 bg-white/75 shadow-sm backdrop-blur">
              <CardHeader className="border-b border-black/5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="text"
                        placeholder="Search by name..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select
                    value={effectiveTrade}
                    onValueChange={(v) => isPremium && setSelectedTrade(v)}
                    disabled={!isPremium}
                  >
                    <SelectTrigger className="sm:w-48">
                      <SelectValue placeholder="All Trades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trades</SelectItem>
                      {catalogTradeNames.map((trade) => (
                        <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="sm:w-48">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="sm:w-48">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {/* Trade chip / summary row — same style as jobs */}
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <span>{effectiveTrade === 'all' ? 'Showing subcontractors:' : 'Showing subcontractors in your trade:'}</span>
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                      {effectiveTrade !== 'all' && TradeIcon ? <TradeIcon className="h-4 w-4 text-blue-600" /> : null}
                      {tradeDisplayValue === 'all' ? 'All trades' : tradeDisplayValue}
                    </span>
                  </span>
                  {!isPremium && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Free: primary trade only
                      </span>
                    </>
                  )}
                </div>

                {/* Premium upsell — when free user restricted to one trade */}
                {!isPremium && (
                  <PremiumUpsellBar
                    title="Unlock multi-trade discovery"
                    description="Premium lets you browse subcontractors across multiple trades, not just your selected trade."
                    ctaLabel="See Premium"
                    href="/pricing"
                    className="mb-6"
                    mobileCollapsible
                  />
                )}

                {/* Loading, error, results list or empty state */}
                {profilesLoading && (
                  <div className="flex min-h-[200px] items-center justify-center py-12">
                    <div className="text-sm text-slate-600">Loading subcontractors…</div>
                  </div>
                )}
                {!profilesLoading && profilesError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">{profilesError}</p>
                  </div>
                )}
                {!profilesLoading && !profilesError && filteredResults.length > 0 ? (
                  <div className="space-y-3">
                    {!isPremium && outsideRadiusCount > 0 && (
                      <p className="text-sm text-slate-600">
                        {outsideRadiusCount} matching profile{outsideRadiusCount === 1 ? '' : 's'} {outsideRadiusCount === 1 ? 'is' : 'are'} outside your {allowedRadiusKm}km radius.
                      </p>
                    )}
                    {filteredResults.map((sub) => (
                      <SubcontractorCard key={sub.id} sub={sub} />
                    ))}
                  </div>
                ) : !profilesLoading && !profilesError ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <Search className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        Subcontractor Directory
                      </h3>
                      <p className="text-slate-600">
                        Browse verified trade businesses by trade, rating, price, and distance.
                      </p>
                    </div>

                    <div className="max-w-2xl mx-auto space-y-5">
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Popular trades</h4>
                        <div className="flex flex-wrap gap-2">
                          {(isPremium ? popularTradesForChips : primaryTrade ? [primaryTrade] : []).map((trade) => (
                            <button
                              key={trade}
                              type="button"
                              onClick={() => isPremium && setSelectedTrade(trade)}
                              disabled={!isPremium}
                              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                effectiveTrade === trade
                                  ? 'bg-blue-600 text-white'
                                  : isPremium
                                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    : 'bg-slate-100 text-slate-700 cursor-default opacity-90'
                              }`}
                            >
                              {trade}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          Search tips
                        </h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li>• Search by trade to find relevant subcontractors</li>
                          <li>• Use sort to compare distance, price, or rating</li>
                          <li>• Verified businesses will appear first when filtered</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
