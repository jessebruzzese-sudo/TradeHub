'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

type TradesNearYouData = {
  totalAccountsRounded: string;
  totalAccountsExact: number;
  trades: { trade: string; count: number }[];
  message?: string;
};

export function PublicMetricsCard() {
  const [data, setData] = useState<TradesNearYouData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/discovery/trades-near-you')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('Sign in to see discovery');
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-gray-100">
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-5 flex-1 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Total accounts</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {data.totalAccountsRounded}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {data.message ?? 'discoverable near you'}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Users className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
