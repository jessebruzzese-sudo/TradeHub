/**
 * Server-side tender creation limits: Free = 1 active tender per month, Premium = unlimited.
 */

import { getTier, getLimits } from './plan-limits';

// Rolling window limits: quota is based on last 30 days from *now* (submission time),
// not calendar month start. Deleted items still count (soft delete).

/** Tenders that count toward monthly limit: published, live, or pending approval. */
const ACTIVE_TENDER_STATUSES = ['PUBLISHED', 'LIVE', 'PENDING_APPROVAL'] as const;

export type TenderLimitResult = {
  allowed: boolean;
  count?: number;
  message?: string;
};

export async function checkTenderCreationLimit(
  supabase: { from: (table: string) => any },
  userId: string,
  dbUser: { id: string; role?: string; is_premium?: boolean | null; subscription_status?: string | null; active_plan?: string | null; subcontractor_plan?: string | null; subcontractor_sub_status?: string | null }
): Promise<TenderLimitResult> {
  const tier = getTier(dbUser);
  const limits = getLimits(tier);

  if (limits.tenderPerMonth === 'unlimited') {
    return { allowed: true };
  }

  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('tenders')
    .select('id', { count: 'exact', head: true })
    .eq('builder_id', userId)
    .in('status', ACTIVE_TENDER_STATUSES)
    .gte('created_at', start);

  if (error) {
    console.error('Tender limit check error:', error);
    return { allowed: true }; // fail open on error
  }

  const current = count ?? 0;
  if (current >= (limits.tenderPerMonth as number)) {
    return {
      allowed: false,
      count: current,
      message: 'Free plan includes 1 active tender per month.',
    };
  }

  return { allowed: true, count: current };
}
