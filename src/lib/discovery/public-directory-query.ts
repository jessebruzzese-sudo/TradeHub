/**
 * Resilient public `users` reads for discovery APIs (schema drift / legacy DBs).
 *
 * Used by `/api/discovery/search` (broad directory) and `/api/discovery/trade/*` (subcontractors).
 * `/subcontractors` adds a separate gate: active rows in `subcontractor_availability` (see trade route).
 */

import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { isPostgrestSchemaColumnError } from '@/lib/postgrest-schema-error';
import { isMissingTableColumnError } from '@/lib/supabase/postgrest-errors';

const DIRECTORY_TABLE = 'users' as const;

/** Widest first; narrow on missing-column errors from PostgREST. */
export const DIRECTORY_SELECT_LAYERS = [
  'id, name, business_name, avatar, primary_trade, additional_trades, location, postcode, rating, is_public_profile, abn, abn_status, abn_verified_at, role, location_lat, location_lng, search_lat, search_lng, lat, lng, deleted_at, mini_bio, cover_url, plan, subscription_status, complimentary_premium_until, pricing_type, pricing_amount, show_pricing_in_listings, premium_until, is_premium, reliability_rating, profile_strength_score, completed_jobs',
  'id, name, business_name, avatar, primary_trade, additional_trades, location, postcode, rating, is_public_profile, abn, abn_status, role, location_lat, location_lng, search_lat, search_lng, lat, lng, deleted_at, plan, subscription_status, complimentary_premium_until',
  'id, name, avatar, primary_trade, additional_trades, location, postcode, is_public_profile, abn, abn_status, location_lat, location_lng, lat, lng, role, plan, subscription_status, complimentary_premium_until',
  'id, name, avatar, primary_trade, additional_trades, location, is_public_profile, abn, abn_status, location_lat, location_lng, lat, lng',
  'id, name, avatar, primary_trade, location, is_public_profile, abn, abn_status, location_lat, location_lng, lat, lng',
  'id, name, avatar, primary_trade, location, is_public_profile, abn, abn_status, location_lat, location_lng',
  'id, name, primary_trade, location, is_public_profile, abn, abn_status',
  'id, name, primary_trade, is_public_profile',
  'id, name, primary_trade',
] as const;

type FilterMode = { publicEq: boolean; deletedNull: boolean };

const FILTER_MODES: FilterMode[] = [
  { publicEq: true, deletedNull: true },
  { publicEq: true, deletedNull: false },
  { publicEq: false, deletedNull: false },
];

function postFilterDirectoryRows(
  rows: Record<string, unknown>[],
  mode: FilterMode
): Record<string, unknown>[] {
  let out = rows;
  if (!mode.publicEq) {
    out = out.filter((r) => r['is_public_profile'] !== false);
  }
  if (!mode.deletedNull) {
    out = out.filter((r) => {
      const d = r['deleted_at'];
      return d == null || d === '';
    });
  }
  return out;
}

function buildDirectoryQuery(
  supabase: ReturnType<typeof createServiceSupabase>,
  select: string,
  viewerId: string,
  mode: FilterMode
) {
  let q = (supabase as any).from(DIRECTORY_TABLE).select(select).neq('id', viewerId);
  if (mode.publicEq) q = q.eq('is_public_profile', true);
  if (mode.deletedNull) q = q.is('deleted_at', null);
  return q;
}

export async function loadPublicDirectoryUserRows(
  supabase: ReturnType<typeof createServiceSupabase>,
  viewerId: string
): Promise<
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; error: unknown; stage: 'candidates_query' }
> {
  console.log(
    '[discovery/directory] query build: no SQL role filter, no SQL test-account email/name filters (route post-filters)'
  );
  for (const select of DIRECTORY_SELECT_LAYERS) {
    for (const mode of FILTER_MODES) {
      const { data, error } = await buildDirectoryQuery(supabase, select, viewerId, mode);

      if (!error) {
        const rows = postFilterDirectoryRows((data ?? []) as Record<string, unknown>[], mode);
        console.log('[discovery/directory] query ok', {
          selectPreview: select.slice(0, 96),
          filterMode: mode,
          rowCount: rows.length,
        });
        return { ok: true, rows };
      }

      if (!isPostgrestSchemaColumnError(error)) {
        console.error('[discovery/directory] query failed (non-schema)', error, {
          selectPreview: select.slice(0, 96),
          mode,
        });
        return { ok: false, error, stage: 'candidates_query' };
      }

      if (mode.deletedNull && isMissingTableColumnError(error, 'deleted_at')) {
        console.warn('[discovery/directory] retry next filter mode (no deleted_at)', {
          selectPreview: select.slice(0, 80),
        });
        continue;
      }
      if (mode.publicEq && isMissingTableColumnError(error, 'is_public_profile')) {
        console.warn('[discovery/directory] retry next filter mode (no is_public_profile)', {
          selectPreview: select.slice(0, 80),
        });
        continue;
      }

      console.warn('[discovery/directory] narrowing select (column mismatch)', {
        message: (error as { message?: string })?.message,
        selectPreview: select.slice(0, 80),
      });
      break;
    }
  }

  return {
    ok: false,
    error: new Error('Directory query exhausted select/filter fallbacks'),
    stage: 'candidates_query',
  };
}

/** Billing + coordinates for discovery viewer (widest first). */
export const VIEWER_DISCOVERY_SELECT_LAYERS = [
  'id,plan,subscription_status,complimentary_premium_until,search_lat,search_lng,location_lat,location_lng,lat,lng',
  'id,plan,subscription_status,complimentary_premium_until,location_lat,location_lng,lat,lng',
  'id,plan,subscription_status,complimentary_premium_until,location_lat,location_lng',
  'id,plan,subscription_status,complimentary_premium_until',
  'id,plan',
  'id',
] as const;

export async function loadViewerDiscoveryRow(
  supabaseAuth: ReturnType<typeof createServerSupabase>,
  userId: string
): Promise<
  | { ok: true; me: Record<string, unknown> }
  | { ok: false; error: unknown; stage: 'viewer_profile' }
> {
  let lastErr: unknown = null;
  for (const select of VIEWER_DISCOVERY_SELECT_LAYERS) {
    console.log('[discovery/viewer] query', { table: 'users', select });
    const { data, error } = await (supabaseAuth as any)
      .from('users')
      .select(select)
      .eq('id', userId)
      .maybeSingle();

    if (!error) {
      if (data) return { ok: true as const, me: data as Record<string, unknown> };
      return {
        ok: false as const,
        error: new Error('User profile row not found'),
        stage: 'viewer_profile' as const,
      };
    }
    lastErr = error;
    if (!isPostgrestSchemaColumnError(error)) {
      console.error('[discovery/viewer] query failed (non-schema)', error, { select });
      return { ok: false as const, error, stage: 'viewer_profile' as const };
    }
  }
  console.error('[discovery/viewer] exhausted select layers', lastErr);
  return { ok: false as const, error: lastErr, stage: 'viewer_profile' as const };
}
