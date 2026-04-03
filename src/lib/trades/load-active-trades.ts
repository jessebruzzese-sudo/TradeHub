import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { normalizeTrade } from '@/lib/trades/normalizeTrade';

export type PublicTradeRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

/**
 * Active rows from `public.trades`, ordered for UI (sort_order, then name).
 */
export async function loadActiveTrades(
  supabase: SupabaseClient<Database>
): Promise<PublicTradeRow[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('id, name, slug, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[trades] loadActiveTrades', error);
    throw new Error(error.message);
  }

  return (data ?? []) as PublicTradeRow[];
}

export async function loadActiveTradeNames(supabase: SupabaseClient<Database>): Promise<string[]> {
  const rows = await loadActiveTrades(supabase);
  return rows.map((r) => r.name);
}

/**
 * Match a user/API string to an exact catalog `name` (trim, then normalizeTrade for legacy aliases).
 */
export function resolveTradeAgainstCatalog(
  raw: string,
  catalogNames: readonly string[]
): string | null {
  const set = new Set(catalogNames);
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  if (set.has(trimmed)) return trimmed;
  const n = normalizeTrade(trimmed);
  if (n && set.has(n)) return n;
  return null;
}
