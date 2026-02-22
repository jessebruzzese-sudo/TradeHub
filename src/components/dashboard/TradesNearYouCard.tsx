'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lock, Wrench } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { isPremiumForDiscovery, getDiscoveryRadiusKm } from '@/lib/discovery';

type TradesNearYouData = {
  totalAccountsRounded: string;
  totalAccountsExact: number;
  trades: { trade: string; count: number }[];
  message?: string;
};

/** UI-only teaser trades (no real data, psychological teaser for free users). */
const TEASER_TRADES = ['Tilers', 'Plasterers', 'Landscapers'];

export function TradesNearYouCard() {
  const { currentUser } = useAuth();
  const userForDiscovery = currentUser
    ? {
        is_premium: currentUser.isPremium ?? undefined,
        subscription_status: currentUser.subscriptionStatus,
        subcontractor_sub_status: undefined,
        active_plan: currentUser.activePlan,
        subcontractor_plan: undefined,
      }
    : null;
  const isPremium = isPremiumForDiscovery(userForDiscovery);
  const radiusKm = getDiscoveryRadiusKm(userForDiscovery);
  const isAdmin = currentUser?.is_admin === true;
  const showTeaser = !isPremium && !isAdmin;

  const [data, setData] = useState<TradesNearYouData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/discovery/trades-near-you')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('Sign in to see trades');
          throw new Error('Failed to load');
        }
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  const trades = data.trades ?? [];
  const displayTrades = trades.slice(0, 8);
  const teaserItems = TEASER_TRADES.map((t) => ({ trade: t, count: 0 }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Trades near you</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-1 text-xs ${
              isPremium
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {radiusKm}km radius
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {data.message ?? `Discover ${data.totalAccountsExact} professionals nearby`}
      </p>
      <p className="mt-2 mb-2 text-xs text-muted-foreground">
        Showing trades within {radiusKm}km of your location.
      </p>
      {trades.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          No public profiles in your area yet. Update your location or try again later.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {displayTrades.map(({ trade, count }) => (
            <li key={trade}>
              <Link
                href={`/discover/${encodeURIComponent(trade)}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                <span>{trade}</span>
                <span className="flex items-center gap-1">
                  <span className="font-medium text-gray-900">{count}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showTeaser && trades.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-muted/30">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <span className="text-xs font-medium text-gray-700">More trades (Premium)</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              Locked
            </span>
          </div>
          <ul className="space-y-0">
            {teaserItems.map(({ trade }) => (
              <li
                key={trade}
                className="flex cursor-not-allowed items-center justify-between px-3 py-2 text-sm text-gray-500"
              >
                <span className="blur-sm opacity-60">{trade}</span>
                <span className="flex items-center gap-1.5 opacity-60">
                  <span className="blur-sm">??</span>
                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-200 px-3 py-3">
            <p className="mb-2 text-xs text-gray-600">
              Unlock more trades up to 50km.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              View Premium
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
