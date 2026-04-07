import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { AppStore } from '@/lib/store';
import type { User, UserRole, TrustStatus } from '@/lib/types';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';
import { isPostgrestSchemaOrColumnError } from '@/lib/supabase/postgrest-errors';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';

const JOBS_NARROW_SELECT =
  'id, contractor_id, title, description, trade_category, location, postcode, dates, start_time, duration, pay_type, rate, status, created_at, attachments, cancelled_at, cancelled_by, cancellation_reason, selected_subcontractor, confirmed_subcontractor, location_lat, location_lng, deleted_at, approval_status, fulfilled, starts_at, fulfillment_marked_at, fulfillment_marked_by, reminder_48h_sent, file_url, file_name, location_place_id, start_date, updated_at';

const JOBS_MINIMAL_SELECT =
  'id, contractor_id, title, description, trade_category, location, postcode, dates, start_time, pay_type, rate, status, created_at, attachments, cancelled_at, cancelled_by, cancellation_reason, selected_subcontractor, confirmed_subcontractor';

const CONTRACTOR_LIST_ALIGNED_SELECT = 'id, name, business_name, avatar, rating';

const CONTRACTOR_MEDIUM_SELECT =
  'id, name, email, business_name, avatar, rating, role, trust_status, completed_jobs, created_at, primary_trade, additional_trades, additional_trades_unlocked, location, postcode, radius, availability, abn, bio, plan, subscription_status, complimentary_premium_until, abn_status, abn_verified_at, abn_verified_by, abn_rejection_reason, abn_submitted_at, reliability_rating';

export type LoadJobByIdSource = 'broad' | 'narrow' | 'minimal' | 'rpc_visible_list';

export type LoadJobByIdResult = {
  job: Record<string, unknown> | null;
  error: unknown;
  source: LoadJobByIdSource | null;
  selectUsed: string | null;
};

async function fetchJobWithSelect(
  supabase: SupabaseClient<Database>,
  id: string,
  select: string,
  attempt: LoadJobByIdSource
): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  console.log('loadJobById attempt', { id, attempt });
  const { data, error } = await supabase
    .from('jobs')
    .select(select)
    .eq('id', id)
    .gte('created_at', jobsListingWindowStartIso())
    .maybeSingle();
  console.log('loadJobById result', { id, attempt, found: !!data, error: error ?? null });
  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error ?? null,
  };
}

/**
 * Load a single job row with layered selects and optional RPC fallback (same rows as /jobs Find Work).
 */
export async function loadJobById(
  supabase: SupabaseClient<Database>,
  id: string,
  options?: { viewerId?: string | null }
): Promise<LoadJobByIdResult> {
  let lastError: unknown = null;

  // 1) Broad
  {
    const { data, error } = await fetchJobWithSelect(supabase, id, '*', 'broad');
    if (!error && data) {
      return { job: data, error: null, source: 'broad', selectUsed: '*' };
    }
    if (error && !isPostgrestSchemaOrColumnError(error)) {
      lastError = error;
    }
    if (error && isPostgrestSchemaOrColumnError(error)) {
      lastError = error;
    }
  }

  // 2) Narrow (schema mismatch on *)
  {
    const { data, error } = await fetchJobWithSelect(supabase, id, JOBS_NARROW_SELECT, 'narrow');
    if (!error && data) {
      return { job: data, error: null, source: 'narrow', selectUsed: JOBS_NARROW_SELECT };
    }
    if (error) lastError = error;
  }

  // 3) Minimal columns
  {
    const { data, error } = await fetchJobWithSelect(supabase, id, JOBS_MINIMAL_SELECT, 'minimal');
    if (!error && data) {
      return { job: data, error: null, source: 'minimal', selectUsed: JOBS_MINIMAL_SELECT };
    }
    if (error) lastError = error;
  }

  // 4) Align with Find Work: same RPC + scan for id (security definer — matches listing visibility)
  const viewerId = options?.viewerId;
  if (viewerId) {
    console.log('loadJobById attempt', { id, attempt: 'rpc_visible_list' });
    const { data: rpcRows, error: rpcError } = await (supabase as any).rpc('get_jobs_visible_to_viewer', {
      viewer_id: viewerId,
      trade_filter: null,
      limit_count: 200,
      offset_count: 0,
    });
    console.log('loadJobById result', {
      id,
      attempt: 'rpc_visible_list',
      found: Array.isArray(rpcRows) && rpcRows.some((r: any) => String(r?.id) === String(id)),
      error: rpcError ?? null,
    });
    if (!rpcError && Array.isArray(rpcRows)) {
      const hit = rpcRows.find((r: any) => String(r?.id) === String(id));
      if (hit) {
        return { job: hit as Record<string, unknown>, error: null, source: 'rpc_visible_list', selectUsed: 'get_jobs_visible_to_viewer()' };
      }
    } else if (rpcError) {
      lastError = rpcError;
    }
  }

  return { job: null, error: lastError, source: null, selectUsed: null };
}

function userFromRow(userData: Record<string, unknown>): User {
  const now = new Date();
  return {
    id: userData.id as string,
    name: (userData.name as string) || 'TradeHub user',
    email: (userData.email as string) || '',
    role: (userData.role as UserRole) || 'contractor',
    trustStatus: ((userData.trust_status || 'pending') as TrustStatus) || 'pending',
    rating: typeof userData.rating === 'number' ? userData.rating : Number(userData.rating) || 0,
    reliabilityRating: userData.reliability_rating != null ? Number(userData.reliability_rating) : undefined,
    completedJobs: typeof userData.completed_jobs === 'number' ? userData.completed_jobs : Number(userData.completed_jobs) || 0,
    memberSince: new Date((userData.created_at as string) ?? now),
    createdAt: new Date((userData.created_at as string) ?? now),
    primaryTrade: userData.primary_trade != null ? String(userData.primary_trade) : undefined,
    additionalTrades: (userData.additional_trades as string[]) || [],
    additionalTradesUnlocked: Boolean(userData.additional_trades_unlocked),
    businessName: userData.business_name != null ? String(userData.business_name) : undefined,
    abn: userData.abn != null ? String(userData.abn) : undefined,
    bio: userData.bio != null ? String(userData.bio) : undefined,
    trades: getDisplayTradeListFromUserRow({
      primary_trade: userData.primary_trade as string | null,
      additional_trades: userData.additional_trades as string[] | null,
    }),
    location: userData.location != null ? String(userData.location) : undefined,
    postcode: userData.postcode != null ? String(userData.postcode) : undefined,
    radius: userData.radius != null ? Number(userData.radius) : undefined,
    availability: userData.availability as User['availability'],
    avatar: userData.avatar != null ? String(userData.avatar) : undefined,
    plan: userData.plan != null ? (String(userData.plan) as User['plan']) : undefined,
    subscriptionStatus: (userData.subscription_status as User['subscriptionStatus']) ?? undefined,
    complimentaryPremiumUntil:
      userData.complimentary_premium_until != null
        ? String(userData.complimentary_premium_until)
        : undefined,
    abnStatus: userData.abn_status as User['abnStatus'],
    abnVerifiedAt: userData.abn_verified_at != null ? String(userData.abn_verified_at) : undefined,
    abnVerifiedBy: userData.abn_verified_by != null ? String(userData.abn_verified_by) : undefined,
    abnRejectionReason:
      userData.abn_rejection_reason != null ? String(userData.abn_rejection_reason) : undefined,
    abnSubmittedAt: userData.abn_submitted_at != null ? String(userData.abn_submitted_at) : undefined,
  };
}

async function fetchContractorRow(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  select: string,
  attempt: string
): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  console.log('loadContractorForJob attempt', { contractorId, attempt });
  const { data, error } = await supabase.from('users').select(select).eq('id', contractorId).maybeSingle();
  console.log('loadContractorForJob result', { contractorId, attempt, found: !!data, error: error ?? null });
  return { data: (data as Record<string, unknown> | null) ?? null, error: error ?? null };
}

/**
 * Ensure contractor exists in the client store: same column strategy as /jobs list, then fallbacks.
 */
export async function syncContractorIntoStore(
  supabase: SupabaseClient<Database>,
  store: AppStore,
  contractorId: string
): Promise<void> {
  if (!contractorId) return;
  if (store.getUserById(contractorId)) return;

  let row: Record<string, unknown> | null = null;

  const attempts = [
    { sel: CONTRACTOR_MEDIUM_SELECT, attempt: 'medium' },
    { sel: CONTRACTOR_LIST_ALIGNED_SELECT, attempt: 'list_aligned' },
    { sel: 'id, name, avatar', attempt: 'minimal_user' },
  ] as const;

  for (const { sel, attempt } of attempts) {
    const { data, error } = await fetchContractorRow(supabase, contractorId, sel, attempt);
    if (error) {
      if (isPostgrestSchemaOrColumnError(error)) continue;
      continue;
    }
    if (data) {
      row = data;
      break;
    }
  }

  if (row && row.id) {
    store.users.push(userFromRow(row));
    return;
  }

  store.ensureUserInStore({ id: contractorId, name: 'TradeHub user' });
}
