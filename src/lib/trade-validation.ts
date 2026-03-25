/**
 * Strict trade validation for AI-assisted drafts and profile trades.
 * Only allows trades from the canonical TradeHub list.
 * No fuzzy matching – exact match, trimmed whitespace, case-insensitive, or explicit alias only.
 */

import { TRADES, TRADE_ALIASES, normalizeTrade } from './constants/trades';

const TRADES_LIST = TRADES as readonly string[];

/** Fast lookup: lowercase trimmed label → canonical label */
const VALID_TRADE_MAP = new Map<string, string>(
  TRADES.map((label) => [label.trim().toLowerCase(), label])
);

/** Add aliases to the map (alias key → canonical label) */
for (const [alias, canonical] of Object.entries(TRADE_ALIASES)) {
  const key = alias.trim().toLowerCase();
  if (!VALID_TRADE_MAP.has(key) && TRADES_LIST.includes(canonical)) {
    VALID_TRADE_MAP.set(key, canonical);
  }
}

/**
 * Validate an AI-returned trade name against the canonical TradeHub list.
 * Returns the canonical label if valid, null otherwise.
 * Supports: exact match, trimmed whitespace, case-insensitive, explicit alias.
 */
export function validateTradeName(aiTradeName: string): string | null {
  const t = String(aiTradeName ?? '').trim();
  if (!t) return null;

  return normalizeTrade(t) ?? VALID_TRADE_MAP.get(t.toLowerCase()) ?? null;
}

/**
 * Filter and normalize an array of AI trade names.
 * Returns only valid trades with their canonical labels.
 * Invalid trades are dropped and optionally logged (dev only).
 */
export function filterValidTrades(
  aiTradeNames: string[],
  options?: { logInvalid?: boolean }
): string[] {
  const result: string[] = [];
  const invalid: string[] = [];

  for (const name of aiTradeNames) {
    const canonical = validateTradeName(name);
    if (canonical) {
      if (!result.includes(canonical)) result.push(canonical);
    } else if (name?.trim()) {
      invalid.push(name.trim());
    }
  }

  if (invalid.length > 0 && options?.logInvalid && process.env.NODE_ENV === 'development') {
    console.warn('[trade-validation] Invalid AI trade names dropped:', invalid);
  }

  return result;
}

/**
 * Validate a trade-with-scope object. Returns canonical trade + scope if valid, null otherwise.
 */
export function validateTradeWithScope<T extends { trade: string; scope?: string; [k: string]: unknown }>(
  item: T
): { trade: string; scope: string; rest: Omit<T, 'trade' | 'scope'> } | null {
  const canonical = validateTradeName(item.trade);
  if (!canonical) return null;

  const { trade: _t, scope: _s, ...rest } = item;
  return {
    trade: canonical,
    scope: String(item.scope ?? '').trim(),
    rest: rest as Omit<T, 'trade' | 'scope'>,
  };
}

/**
 * Filter suggested_trades_with_scope to only valid trades.
 * Preserves scope text for valid trades. Drops invalid trades.
 */
export function filterValidTradesWithScope<
  T extends { trade: string; scope?: string; confidence?: number; evidence?: string[] }
>(items: T[]): T[] {
  const result: T[] = [];
  for (const item of items) {
    const canonical = validateTradeName(item.trade);
    if (canonical) {
      result.push({ ...item, trade: canonical } as T);
    }
  }
  return result;
}

/** Check if a trade name is valid (for UI/API validation). */
export function isValidTrade(tradeName: string): boolean {
  return validateTradeName(tradeName) !== null;
}
