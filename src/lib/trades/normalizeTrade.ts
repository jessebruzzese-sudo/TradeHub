/**
 * Maps legacy / deprecated trade labels to current canonical values.
 * Use on read paths and before persisting so stored data stays consistent.
 */
export function normalizeTrade(trade: string): string {
  if (!trade) return trade;

  const t = trade.toLowerCase().trim();

  if (
    t === 'roof plumbing / stormwater' ||
    t === 'roof plumbing' ||
    t === 'stormwater'
  ) {
    return 'Plumbing';
  }

  if (t === 'building') {
    return 'Builder/Contractor';
  }

  return trade;
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
