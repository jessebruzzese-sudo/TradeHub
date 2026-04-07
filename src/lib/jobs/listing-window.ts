/**
 * Jobs are visible in the product for 30 days from created_at, then hidden from reads
 * and removed by daily cleanup (see purge SQL + cron).
 */
export const JOB_LISTING_VISIBLE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const JOB_LISTING_WINDOW_MS = JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY;

/** Inclusive lower bound for PostgREST `.gte('created_at', …)` */
export function jobsListingWindowStartIso(nowMs = Date.now()): string {
  return new Date(nowMs - JOB_LISTING_WINDOW_MS).toISOString();
}

export function isJobCreatedWithinListingWindow(
  createdAt: string | Date | null | undefined,
  nowMs = Date.now()
): boolean {
  if (createdAt == null) return false;
  const t = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  if (!Number.isFinite(t)) return false;
  return t >= nowMs - JOB_LISTING_WINDOW_MS;
}
