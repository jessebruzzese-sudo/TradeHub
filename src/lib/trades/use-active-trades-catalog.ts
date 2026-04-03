'use client';

import { useEffect, useState } from 'react';

export type CatalogTrade = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

/**
 * Fetches `/api/trades` once (no-store). Use for client trade selectors.
 */
export function useActiveTradesCatalog() {
  const [trades, setTrades] = useState<CatalogTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/trades', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load trades');
        }
        const list = Array.isArray(data?.trades) ? (data.trades as CatalogTrade[]) : [];
        if (!cancelled) setTrades(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load trades');
          setTrades([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const names = trades.map((t) => t.name);
  return { trades, names, loading, error };
}
