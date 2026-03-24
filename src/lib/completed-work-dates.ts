import { differenceInCalendarDays, format, isToday, isYesterday } from 'date-fns';

function parseDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Fragment for "Posted …" lines on cards: "today", "yesterday", "2 days ago", or "15 Mar 2026" when older.
 */
export function formatRelativeTime(input: string | Date | null | undefined): string | null {
  const d = parseDate(input);
  if (!d) return null;
  const now = new Date();
  if (d.getTime() > now.getTime()) return format(d, 'd MMM yyyy');
  if (isToday(d)) return 'today';
  if (isYesterday(d)) return 'yesterday';
  const daysAgo = differenceInCalendarDays(now, d);
  if (daysAgo >= 2 && daysAgo <= 6) return `${daysAgo} days ago`;
  return format(d, 'd MMM yyyy');
}

/** Absolute date for detail headers, e.g. "24 Mar 2026". */
export function formatPostedDate(input: string | Date | null | undefined): string | null {
  const d = parseDate(input);
  if (!d) return null;
  return format(d, 'd MMM yyyy');
}
