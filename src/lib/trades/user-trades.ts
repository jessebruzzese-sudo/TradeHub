/**
 * Canonical user trade model (app layer):
 * - users.primary_trade
 * - users.additional_trades
 * - users.additional_trades_unlocked (capability flag; not a trade list)
 *
 * Legacy `users.trades` / `user_trades` have been removed from the database; canonical columns only.
 */

import { normalizeTradesList } from '@/lib/trades/normalizeTrade';

function normalizeAdditionalTrades(
  additional_trades?: string[] | string | null
): string[] {
  if (Array.isArray(additional_trades)) {
    return additional_trades.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
  }
  if (typeof additional_trades === 'string') {
    return additional_trades.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function getUserTradeList(user: {
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
}): string[] {
  const values = [
    user.primary_trade?.trim(),
    ...normalizeAdditionalTrades(user.additional_trades),
  ].filter((value): value is string => Boolean(value && String(value).trim()));

  return Array.from(new Set(values.map((v) => v.trim())));
}

/** Full display list from canonical columns only (normalized). */
export function getDisplayTradeListFromUserRow(row: {
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
}): string[] {
  const canonical = getUserTradeList(row);
  if (canonical.length === 0) return [];
  return normalizeTradesList(canonical);
}

export function splitSelectedTrades(
  trades: string[],
  allowMultiple: boolean
): { primary_trade: string | null; additional_trades: string[] } {
  const cleaned = Array.from(
    new Set(trades.map((t) => String(t ?? '').trim()).filter(Boolean))
  );
  const normalized = normalizeTradesList(cleaned);

  if (!allowMultiple) {
    return {
      primary_trade: normalized[0] ?? null,
      additional_trades: [],
    };
  }

  return {
    primary_trade: normalized[0] ?? null,
    additional_trades: normalized.slice(1),
  };
}

/** Free-tier job posting: listed trades from canonical columns only. */
export function getListedTradesForJobEligibility(row: {
  primary_trade?: string | null;
  additional_trades?: string[] | string | null;
}): string[] {
  return getDisplayTradeListFromUserRow(row);
}
