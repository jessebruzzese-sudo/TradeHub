/**
 * Durable free-tier job posting limits.
 *
 * Source of truth for free quota is job_post_events (append-only), not active jobs,
 * so deleting jobs cannot free a posting slot.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export const FREE_JOB_POST_WINDOW_DAYS = 30;
export const FREE_JOB_POST_MAX_PER_WINDOW = 1;

export const FREE_JOB_POST_LIMIT_MESSAGE =
  'Free accounts can post 1 job every 30 days. Upgrade to Premium for unlimited job posting.';

export const JOB_POST_LIMIT_ERROR_CODE = 'JOB_POST_LIMIT_FREE';

/** Start of the rolling window (inclusive), UTC ISO string. */
export function rollingJobPostWindowStartIso(): string {
  const ms = FREE_JOB_POST_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

/**
 * Counts durable posting events for this contractor in the rolling 30-day window.
 * Includes events even when the corresponding job is later deleted.
 */
export async function countJobsPostedInWindow(
  supabase: SupabaseClient<Database>,
  contractorId: string
): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('job_post_events')
    .select('id', { count: 'exact', head: true })
    .eq('contractor_id', contractorId)
    .gte('created_at', rollingJobPostWindowStartIso());

  if (error) {
    console.error('[job-post-limits] count error', error);
    throw error;
  }
  return count ?? 0;
}

/**
 * Appends an immutable posting event after a successful live job post.
 */
export async function recordJobPostEvent(
  supabase: SupabaseClient<Database>,
  args: { contractorId: string; jobId: string }
): Promise<void> {
  const { error } = await (supabase as any).from('job_post_events').insert({
    contractor_id: args.contractorId,
    job_id: args.jobId,
  });

  if (error) {
    console.error('[job-post-limits] record event error', error);
    throw error;
  }
}
