/**
 * Read-path normalization: map user/DB strings to canonical labels when possible.
 * Unknown values pass through unchanged (display / legacy rows).
 */

import { normalizeTrade as resolveCanonical } from '@/lib/constants/trades';

export function normalizeTrade(trade: string): string {
  const t = String(trade ?? '').trim();
  if (!t) return '';
  return resolveCanonical(t) ?? t;
}

/** Normalize each trade, drop empties, remove duplicates (order preserved). */
export function normalizeTradesList(trades: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of trades) {
    const s = String(raw ?? '').trim();
    if (!s) continue;
    const n = normalizeTrade(s);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
