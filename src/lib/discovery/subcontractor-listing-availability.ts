/**
 * Source of truth for "listed availability" on TradeHub: table `subcontractor_availability`.
 * Each row is one calendar day (`date` type). Saving availability replaces rows for that user (see POST /api/availability).
 *
 * **Active listing** = the user has ≥1 row with `date >= today`, using the same UTC calendar day as the rest of the app
 * (`toISOString().slice(0, 10)`). Past-only rows do not count; clearing the calendar removes all rows.
 */

import { createServiceSupabase } from '@/lib/supabase-server';
import { isPostgrestSchemaColumnError } from '@/lib/postgrest-schema-error';

export function subcontractorActiveListingDateUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const TABLE = 'subcontractor_availability' as const;

/** Narrow select first; widen if PostgREST rejects the projection (legacy / cache drift). */
const AVAILABILITY_SELECT_LAYERS = ['user_id', '*'] as const;

/**
 * Returns distinct `user_id` values that have at least one availability day on or after today (UTC).
 * Service-role client is required so RLS (own-row-only) does not hide other users' listings.
 */
export async function loadUserIdsWithActiveSubcontractorListing(
  supabase: ReturnType<typeof createServiceSupabase>
): Promise<
  | { ok: true; userIds: Set<string> }
  | { ok: false; error: unknown; stage: 'availability_query' }
> {
  const todayStr = subcontractorActiveListingDateUtc();

  for (const select of AVAILABILITY_SELECT_LAYERS) {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(select)
      .gte('date', todayStr);

    if (!error) {
      const userIds = new Set<string>();
      for (const row of data ?? []) {
        const uid = (row as { user_id?: string }).user_id;
        if (typeof uid === 'string' && uid.length > 0) userIds.add(uid);
      }
      return { ok: true, userIds };
    }

    if (select === 'user_id' && isPostgrestSchemaColumnError(error)) {
      console.warn('[discovery/availability] retrying with wider select', {
        message: (error as { message?: string }).message,
      });
      continue;
    }

    console.error('[discovery/availability] subcontractor_availability query failed', error, {
      todayStr,
      select,
    });
    return { ok: false, error, stage: 'availability_query' };
  }

  return {
    ok: false,
    error: new Error('subcontractor_availability: exhausted select fallbacks'),
    stage: 'availability_query',
  };
}
