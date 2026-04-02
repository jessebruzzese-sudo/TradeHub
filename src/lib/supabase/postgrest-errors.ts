/** PostgREST / Postgres signals that a select list does not match the cached schema. */
export function isPostgrestSchemaOrColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; details?: string };
  const code = String(e.code ?? '');
  const msg = String(e.message ?? '').toLowerCase();
  const details = String(e.details ?? '').toLowerCase();
  if (code === 'PGRST204' || code === '42703') return true;
  if (msg.includes('column') && (msg.includes('schema') || msg.includes('does not exist'))) return true;
  if (details.includes('column') && details.includes('does not exist')) return true;
  return false;
}
