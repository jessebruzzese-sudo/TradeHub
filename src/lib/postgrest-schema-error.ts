/**
 * Detect PostgREST / Postgres errors caused by missing columns or stale schema cache.
 * Matches patterns used in auth profile loading fallbacks.
 */
export function isPostgrestSchemaColumnError(err: unknown): boolean {
  const code = String((err as { code?: unknown })?.code ?? '');
  if (code === '42703' || code === 'PGRST204' || code === 'PGRST205') return true;
  const msg = String((err as { message?: unknown })?.message ?? '').toLowerCase();
  if (msg.includes('column') && msg.includes('does not exist')) return true;
  if (msg.includes('schema cache')) return true;
  if (msg.includes('could not find') && msg.includes('column')) return true;
  return false;
}
