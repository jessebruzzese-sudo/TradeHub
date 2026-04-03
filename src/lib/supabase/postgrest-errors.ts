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

/** True when PostgREST/Postgres reports a missing column (e.g. older DB without `title`). */
export function isMissingTableColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const col = columnName.trim().toLowerCase();
  if (!col) return false;
  const e = error as { message?: string; details?: string; code?: string };
  const code = String(e.code ?? '');
  if (code === 'PGRST204' || code === '42703') {
    const blob = `${String(e.message ?? '')} ${String(e.details ?? '')}`.toLowerCase();
    return blob.includes(col);
  }
  const msg = String(e.message ?? '').toLowerCase();
  const details = String(e.details ?? '').toLowerCase();
  const combined = `${msg} ${details}`;
  if (!combined.includes(col)) return false;
  if (combined.includes('does not exist')) return true;
  if (combined.includes('schema cache')) return true;
  return false;
}

export function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; details?: string };
  if (String(e.code ?? '') === '23503') return true;
  const blob = `${String(e.message ?? '')} ${String(e.details ?? '')}`.toLowerCase();
  return blob.includes('foreign key') || blob.includes('violates foreign key');
}

/** Human-readable single line for API `details` and logs. */
export function formatPostgrestError(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (typeof error !== 'object') return String(error);
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint].filter((x) => typeof x === 'string' && x.trim());
  if (parts.length) return parts.join(' — ');
  if (e.code) return `Code ${e.code}`;
  return 'Unknown error';
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return formatPostgrestError(error);
}
