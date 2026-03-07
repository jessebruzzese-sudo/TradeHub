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
import { Search, Lightbulb, Users, ArrowLeft, MapPin, Star, BadgeCheck, Crown, ArrowRight, Calendar } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { format } from 'date-fns';

// TEMP MOCK DATA — replace with real subcontractor query later
const mockSubcontractors = [
  {
    id: 'mock-1',
    businessName: 'South East Plumbing Co',
    avatar_url: null,
    trade: 'Plumbing',
    location: 'Melbourne, VIC',
    rating: 4.8,
    reviewCount: 42,
    hourlyRate: 95,
    isAbnVerified: true,
    isPremium: true,
    distanceKm: 4.2,
    availabilityLabel: 'Available this week',
    description: 'Licensed plumbers for residential and commercial. Specialising in hot water, gas fitting, and emergency callouts.',
    pricingType: 'hourly' as const,
    pricingAmount: 95,
    showPricingInListings: true,
  },
  {
    id: 'mock-2',
    businessName: 'Apex Electrical Group',
    avatar_url: null,
    trade: 'Electrical',
    location: 'Geelong, VIC',
    rating: 4.9,
    reviewCount: 67,
    hourlyRate: 110,
    isAbnVerified: true,
    isPremium: true,
    distanceKm: 52,
    availabilityLabel: 'Available next Monday',
    description: 'Level 2 ASP. Commercial and domestic electrical. Switchboard upgrades, solar, and general repairs.',
    pricingType: 'from_hourly' as const,
    pricingAmount: 110,
    showPricingInListings: true,
  },
  {
    id: 'mock-3',
    businessName: 'Metro Carpentry Works',
    avatar_url: null,
    trade: 'Carpentry',
    location: 'Richmond, VIC',
    rating: 4.6,
    reviewCount: 28,
    hourlyRate: 85,
    isAbnVerified: true,
    isPremium: false,
    distanceKm: 8.5,
    availabilityLabel: 'Available this week',
    description: 'Framing, fit-out, and custom joinery. Experienced in residential renovations and new builds.',
    pricingType: null,
    pricingAmount: null,
    showPricingInListings: false,
  },
  {
    id: 'mock-4',
    businessName: 'SolidSet Concreting',
    avatar_url: null,
    trade: 'Concreting',
    location: 'Ballarat, VIC',
    rating: 4.7,
    reviewCount: 35,
    hourlyRate: 75,
    isAbnVerified: true,
    isPremium: false,
    distanceKm: 112,
    availabilityLabel: 'Available in 2 weeks',
    description: 'Driveways, slabs, footpaths, and exposed aggregate. Quality work across regional Victoria.',
    pricingType: 'day' as const,
    pricingAmount: null,
    showPricingInListings: true,
  },
  {
    id: 'mock-5',
    businessName: 'BlueLine Painting',
    avatar_url: null,
    trade: 'Painting & Decorating',
    location: 'St Kilda, VIC',
    rating: 4.5,
    reviewCount: 19,
    hourlyRate: 65,
    isAbnVerified: false,
    isPremium: false,
    distanceKm: 12,
    availabilityLabel: 'Available next week',
    description: 'Interior and exterior painting. Residential and commercial. Free quotes.',
    pricingType: 'quote_on_request' as const,
    pricingAmount: null,
    showPricingInListings: true,
  },
  {
    id: 'mock-6',
    businessName: 'Prime Flow Plumbing',
    avatar_url: null,
    trade: 'Plumbing',
    location: 'Dandenong, VIC',
    rating: 4.4,
    reviewCount: 31,
    hourlyRate: 88,
    isAbnVerified: true,
    isPremium: false,
    distanceKm: 35,
    availabilityLabel: 'Available this week',
    description: 'Blocked drains, leak detection, and general plumbing. 24/7 emergency service available.',
    pricingType: null,
    pricingAmount: null,
    showPricingInListings: false,
  },
] as const;

type MockSubcontractor = (typeof mockSubcontractors)[number];

const POPULAR_TRADES = ['Plumbing', 'Electrical', 'Carpentry', 'Concreting', 'Painting & Decorating'] as const;

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

function formatPricingLabel(sub: MockSubcontractor): string | null {
  if (!sub.showPricingInListings) return null;
  const type = sub.pricingType;
  const amount = sub.pricingAmount;
  if (type === 'hourly' && amount != null && amount > 0) return `$${amount}/hr`;
  if (type === 'from_hourly' && amount != null && amount > 0) return `From $${amount}/hr`;
  if (type === 'day' && amount != null && amount > 0) return `$${amount}/day`;
  if (type === 'day') return 'Day rate available';
  if (type === 'quote_on_request') return 'Quote on request';
  return null;
}

function SubcontractorCard({ sub }: { sub: MockSubcontractor }) {
  const TradeIcon = getTradeIcon(sub.trade);
  const avatarUrl = sub.avatar_url ?? null;
  const pricingLabel = formatPricingLabel(sub);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <UserAvatar
            avatarUrl={avatarUrl}
            userName={sub.businessName}
            size="lg"
            className="h-12 w-12 shrink-0 ring-2 ring-slate-100"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{sub.businessName}</h3>
            {sub.isAbnVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                ABN verified
              </span>
            )}
            {sub.isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                <Crown className="h-3.5 w-3.5" />
                Premium
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            {TradeIcon ? <TradeIcon className="h-4 w-4 text-blue-600" /> : null}
            <span>{sub.trade}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-700">{sub.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 flex-shrink-0 text-sky-600" />
              {sub.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700">
              {sub.distanceKm.toFixed(sub.distanceKm < 10 ? 1 : 0)} km away
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span className="font-medium text-slate-700">{sub.rating.toFixed(1)}</span>
              <span className="text-slate-400">({sub.reviewCount})</span>
            </span>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              {sub.availabilityLabel}
            </span>
          {pricingLabel && (
            <span className="mt-2 block text-xs text-slate-600">
              {pricingLabel}
            </span>
          )}
          </div>
        </div>
        <Link href={`/profile/${sub.id}`} className="shrink-0">
          <Button size="sm" variant="outline" className="gap-2">
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('distance-closest');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [availLoading, setAvailLoading] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<Date | null>(null);

  const nextAvailableLabel = useMemo(() => {
    if (!nextAvailable) return null;
    return format(nextAvailable, 'EEE d MMM');
  }, [nextAvailable]);

  const userForDiscovery = useMemo(
    () =>
      currentUser
        ? {
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
  const primaryTrade = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade ?? null;

  // Free users: locked to primary trade only. Premium: can browse across trades.
  const effectiveTrade = isPremium ? selectedTrade : (primaryTrade || 'all');
  const tradeDisplayValue = isPremium ? selectedTrade : (primaryTrade || 'All Trades');
  const TradeIcon = getTradeIcon(primaryTrade || undefined);

  // Local filter/sort of mock data (replace with real query when backend ready)
  const filteredResults = useMemo(() => {
    let list = [...mockSubcontractors] as MockSubcontractor[];

    // Search by business name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) => s.businessName.toLowerCase().includes(q));
    }

    // Trade filter
    if (effectiveTrade !== 'all') {
      list = list.filter((s) => s.trade === effectiveTrade);
    }

    // ABN verified filter
    if (filterBy === 'abn-verified') {
      list = list.filter((s) => s.isAbnVerified);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'distance-closest':
          return a.distanceKm - b.distanceKm;
        case 'distance-furthest':
          return b.distanceKm - a.distanceKm;
        case 'price-highest':
          return b.hourlyRate - a.hourlyRate;
        case 'price-lowest':
          return a.hourlyRate - b.hourlyRate;
        case 'rating-highest':
          return b.rating - a.rating;
        case 'rating-lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    return list;
  }, [searchQuery, effectiveTrade, filterBy, sortBy]);

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
        {/* Blue wrapper (same as tenders page) */}
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
                    Browse and connect with verified subcontractors
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
                      {TRADE_CATEGORIES.map((trade) => (
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
                  />
                )}

                {/* Results list or empty state */}
                {filteredResults.length > 0 ? (
                  <div className="space-y-3">
                    {filteredResults.map((sub) => (
                      <SubcontractorCard key={sub.id} sub={sub} />
                    ))}
                  </div>
                ) : (
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
                          {(isPremium ? POPULAR_TRADES : primaryTrade ? [primaryTrade] : []).map((trade) => (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
