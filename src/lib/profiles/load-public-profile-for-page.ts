import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import {
  E2E_PUBLIC_PROFILE_REGRESSION_ID,
} from '@/lib/e2e/public-profile-search-params';
import { isPostgrestSchemaOrColumnError } from '@/lib/supabase/postgrest-errors';
import { createServiceSupabase } from '@/lib/supabase-server';
import { isLikelyTestAccount } from '@/lib/test-account';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';
import { hasPremiumAccess } from '@/lib/billing/has-premium-access';

export { E2E_PUBLIC_PROFILE_REGRESSION_ID } from '@/lib/e2e/public-profile-search-params';

const isDev = process.env.NODE_ENV === 'development';

function dbg(...args: unknown[]) {
  if (isDev) console.log('[public-profile]', ...args);
}

/** Matches `public_profile_directory` wide select used by ProfileView. */
const DIRECTORY_FULL_SELECT =
  'id, name, business_name, avatar, cover_url, location, postcode, mini_bio, bio, rating, reliability_rating, completed_jobs, member_since, abn_status, abn_verified_at, premium_now, website, instagram, facebook, linkedin, tiktok, youtube, abn, pricing_type, pricing_amount, show_pricing_on_profile';

const DIRECTORY_NARROW_SELECT =
  'id, name, business_name, avatar, cover_url, location, postcode, mini_bio, bio, rating, reliability_rating, completed_jobs, member_since, abn_status, abn_verified_at, premium_now, website, instagram, facebook, linkedin, tiktok, youtube, abn';

const USERS_SELF_SELECT =
  'id, name, business_name, avatar, cover_url, bio, mini_bio, location, postcode, rating, reliability_rating, completed_jobs, member_since, abn_status, abn_verified_at, abn, website, instagram, facebook, linkedin, tiktok, youtube, pricing_type, pricing_amount, show_pricing_on_profile, deleted_at, complimentary_premium_until, plan, subscription_status, is_public_profile';

const USERS_SELF_MINIMAL =
  'id, name, business_name, avatar, cover_url, bio, mini_bio, location, postcode, rating, reliability_rating, completed_jobs, member_since, abn_status, abn_verified_at, abn, website, instagram, facebook, linkedin, tiktok, youtube, deleted_at, complimentary_premium_until, plan, subscription_status, is_public_profile';

function computePremiumNow(u: Record<string, unknown>): boolean {
  return hasPremiumAccess({
    plan: u.plan as string | null,
    subscription_status: u.subscription_status as string | null,
    complimentary_premium_until: u.complimentary_premium_until as string | null,
  });
}

/** Map a `users` row into the shape ProfileView expects from `public_profile_directory`. */
export function mapUserRowToPublicProfileShape(u: Record<string, unknown>): Record<string, unknown> {
  return {
    id: u.id,
    name: u.name,
    business_name: u.business_name,
    avatar: u.avatar,
    cover_url: u.cover_url,
    location: u.location,
    postcode: u.postcode,
    mini_bio: u.mini_bio,
    bio: u.bio ?? u.mini_bio,
    rating: u.rating,
    reliability_rating: u.reliability_rating,
    completed_jobs: u.completed_jobs,
    member_since: u.member_since,
    abn_status: u.abn_status,
    abn_verified_at: u.abn_verified_at,
    premium_now: computePremiumNow(u),
    website: u.website ?? u.website_url ?? null,
    instagram: u.instagram ?? u.instagram_url ?? null,
    facebook: u.facebook ?? u.facebook_url ?? null,
    linkedin: u.linkedin ?? u.linkedin_url ?? null,
    tiktok: u.tiktok,
    youtube: u.youtube,
    abn: u.abn,
    pricing_type: u.pricing_type ?? null,
    pricing_amount: u.pricing_amount ?? null,
    show_pricing_on_profile: u.show_pricing_on_profile ?? null,
    is_public_profile: u.is_public_profile,
    website_url: u.website_url ?? u.website ?? null,
    instagram_url: u.instagram_url ?? u.instagram ?? null,
    facebook_url: u.facebook_url ?? u.facebook ?? null,
    linkedin_url: u.linkedin_url ?? u.linkedin ?? null,
  };
}

export type LoadPublicProfilePageResult =
  | {
      ok: true;
      data: Record<string, unknown>;
      source: 'public_profile_directory' | 'users_public' | 'users_owner_private';
    }
  | { ok: false; reason: 'not_found' | 'test_account_hidden' };

/**
 * Non-production: honor `?__e2e_public_profile=` for {@link E2E_PUBLIC_PROFILE_REGRESSION_ID} only.
 * Simulates directory / users / owner fallback outcomes without Supabase (RSC cannot be intercepted).
 */
function tryE2EPublicProfileOverride(
  profileId: string,
  viewerId: string | null,
  e2eScenarioQuery: string | null
): LoadPublicProfilePageResult | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  const scenario = e2eScenarioQuery?.trim() || null;
  if (!scenario || profileId !== E2E_PUBLIC_PROFILE_REGRESSION_ID) {
    return null;
  }

  const baseUserRow = (): Record<string, unknown> => ({
    id: E2E_PUBLIC_PROFILE_REGRESSION_ID,
    name: 'Jesse Bruzzese',
    business_name: 'Regression Fallback Plumbing',
    avatar: null,
    cover_url: null,
    location: 'Melbourne',
    postcode: '3000',
    mini_bio: 'E2E public profile fallback regression fixture.',
    bio: 'E2E public profile fallback regression fixture.',
    rating: 4.5,
    reliability_rating: 4,
    completed_jobs: 3,
    member_since: '2024-06-01',
    abn_status: null,
    abn_verified_at: null,
    abn: null,
    website: null,
    website_url: null,
    instagram: null,
    instagram_url: null,
    facebook: null,
    facebook_url: null,
    linkedin: null,
    linkedin_url: null,
    tiktok: null,
    youtube: null,
    pricing_type: null,
    pricing_amount: null,
    show_pricing_on_profile: false,
    deleted_at: null,
    complimentary_premium_until: null,
    plan: 'free',
    subscription_status: null,
    primary_trade: 'Plumbing',
    additional_trades: [] as string[],
  });

  switch (scenario) {
    case 'dir_miss_users_public': {
      const raw: Record<string, unknown> = { ...baseUserRow(), is_public_profile: true };
      const mapped = mapUserRowToPublicProfileShape(raw);
      const trades = getDisplayTradeListFromUserRow({
        primary_trade: raw.primary_trade as string,
        additional_trades: raw.additional_trades as string[],
      });
      return {
        ok: true,
        data: { ...mapped, trades, primary_trade: raw.primary_trade },
        source: 'users_public',
      };
    }
    case 'both_miss':
      return { ok: false, reason: 'not_found' };
    case 'owner_private_ok': {
      if (viewerId !== E2E_PUBLIC_PROFILE_REGRESSION_ID) return null;
      const raw: Record<string, unknown> = {
        ...baseUserRow(),
        name: 'Private Owner Fixture',
        is_public_profile: false,
      };
      const mapped = mapUserRowToPublicProfileShape(raw);
      const trades = getDisplayTradeListFromUserRow({
        primary_trade: raw.primary_trade as string,
        additional_trades: raw.additional_trades as string[],
      });
      return {
        ok: true,
        data: { ...mapped, trades, primary_trade: raw.primary_trade },
        source: 'users_owner_private',
      };
    }
    case 'non_owner_private':
      return { ok: false, reason: 'not_found' };
    default:
      return null;
  }
}

/**
 * Load profile row for `/profiles/[id]` (and `/profile/[id]` redirect).
 * - Try `public_profile_directory` first (anon-friendly when RLS allows the underlying view).
 * - If missing, load from `public.users` via service role: `id` + `is_public_profile` + not deleted.
 *   (Fixes cases where the view returns no row because RLS hides `users` from the anon/authenticated role.)
 * - If still missing and viewer is the owner, load from `users` with the session client (private profile).
 */
export async function loadPublicProfileForPage(
  supabase: SupabaseClient<Database>,
  profileId: string,
  viewerId: string | null,
  options?: { e2eScenarioQuery?: string | null }
): Promise<LoadPublicProfilePageResult> {
  dbg('profile page params.id', profileId);
  dbg('viewerId', viewerId);
  dbg('primary query', 'public_profile_directory', 'eq id', profileId);

  const e2e = tryE2EPublicProfileOverride(profileId, viewerId, options?.e2eScenarioQuery ?? null);
  if (e2e !== null) return e2e;

  let data: Record<string, unknown> | null = null;
  let lastError: unknown = null;

  const runDirectory = async (select: string, attempt: string) => {
    dbg('directory attempt', attempt);
    const { data: row, error } = await supabase
      .from('public_profile_directory')
      .select(select)
      .eq('id', profileId)
      .maybeSingle();
    dbg('profile query data', row);
    dbg('profile query error', error);
    return { row: row as Record<string, unknown> | null, error };
  };

  let { row, error } = await runDirectory(DIRECTORY_FULL_SELECT, 'full');
  if (error && isPostgrestSchemaOrColumnError(error)) {
    dbg('schema/column drift on directory full → retry narrow');
    const second = await runDirectory(DIRECTORY_NARROW_SELECT, 'narrow');
    row = second.row;
    error = second.error;
  }

  if (error && !isPostgrestSchemaOrColumnError(error)) {
    lastError = error;
    dbg('directory non-schema error (may still try owner path)', lastError);
  }

  if (row) {
    if (
      isLikelyTestAccount({
        name: row.name as string | undefined,
        businessName: row.business_name as string | undefined,
      })
    ) {
      return { ok: false, reason: 'test_account_hidden' };
    }
    return { ok: true, data: row, source: 'public_profile_directory' };
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    dbg('fallback query', 'users (service)', 'eq id', profileId, 'is_public_profile true');
    try {
      const admin = createServiceSupabase();
      const { data: urow, error: uerr } = await admin
        .from('users')
        .select('*')
        .eq('id', profileId)
        .eq('is_public_profile', true)
        .is('deleted_at', null)
        .maybeSingle();
      dbg('users service data', urow);
      dbg('users service error', uerr);

      if (!uerr && urow) {
        const raw = urow as Record<string, unknown>;
        const mapped = mapUserRowToPublicProfileShape(raw);
        const trades = getDisplayTradeListFromUserRow({
          primary_trade: raw.primary_trade as string | null | undefined,
          additional_trades: raw.additional_trades as string[] | string | null | undefined,
        });
        const withTrades: Record<string, unknown> = {
          ...mapped,
          trades,
          primary_trade: raw.primary_trade ?? (mapped as { primary_trade?: string }).primary_trade,
        };
        if (
          isLikelyTestAccount({
            name: withTrades.name as string | undefined,
            businessName: withTrades.business_name as string | undefined,
          })
        ) {
          return { ok: false, reason: 'test_account_hidden' };
        }
        return { ok: true, data: withTrades, source: 'users_public' };
      }
    } catch (e) {
      dbg('users service fallback threw', e);
    }
  }

  if (viewerId && viewerId === profileId) {
    dbg('owner bypass: query users', 'eq id', profileId);
    const tryUsers = async (sel: string, label: string) => {
      const { data: urow, error: uerr } = await supabase.from('users').select(sel).eq('id', profileId).maybeSingle();
      dbg(`users ${label} data`, urow);
      dbg(`users ${label} error`, uerr);
      return { urow: urow as Record<string, unknown> | null, uerr };
    };

    let u = await tryUsers(USERS_SELF_SELECT, 'full');
    if (u.uerr && isPostgrestSchemaOrColumnError(u.uerr)) {
      dbg('schema drift on users self → retry minimal');
      u = await tryUsers(USERS_SELF_MINIMAL, 'minimal');
    }

    if (u.uerr && !isPostgrestSchemaOrColumnError(u.uerr)) {
      dbg('users self query failed', u.uerr);
    }

    const urow = u.urow;
    if (!urow || urow.deleted_at) {
      return { ok: false, reason: 'not_found' };
    }

    const mapped = mapUserRowToPublicProfileShape(urow);
    if (
      isLikelyTestAccount({
        name: mapped.name as string | undefined,
        businessName: mapped.business_name as string | undefined,
      })
    ) {
      return { ok: false, reason: 'test_account_hidden' };
    }
    return { ok: true, data: mapped, source: 'users_owner_private' };
  }

  if (lastError && isDev) {
    dbg('final: no directory row and not owner; last directory error', lastError);
  }

  return { ok: false, reason: 'not_found' };
}
