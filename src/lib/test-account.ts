type MaybeString = string | null | undefined;

const TEST_EMAIL_EXACT = new Set(['test4@gmail.com', 'test5@gmail.com']);

function norm(value: MaybeString): string {
  return String(value || '').trim().toLowerCase();
}

export function isTestAccountEmail(email: MaybeString): boolean {
  const e = norm(email);
  if (!e) return false;
  if (TEST_EMAIL_EXACT.has(e)) return true;
  if (e.endsWith('@tradehub.test')) return true;
  if (e.startsWith('emailtest_')) return true;
  return false;
}

export function isTestAccountName(name: MaybeString): boolean {
  const n = norm(name);
  if (!n) return false;
  if (n.startsWith('qa ')) return true;
  if (n.includes(' qa ')) return true;
  if (n.includes('manual premium qa')) return true;
  if (n.includes('emailtest_')) return true;
  return false;
}

export function isLikelyTestAccount(input: {
  email?: MaybeString;
  name?: MaybeString;
  businessName?: MaybeString;
}): boolean {
  return (
    isTestAccountEmail(input.email) ||
    isTestAccountName(input.name) ||
    isTestAccountName(input.businessName)
  );
}

/**
 * Adds SQL-side exclusions for known QA/test accounts.
 * Works with Supabase query builders on the `users` table.
 */
export function applyExcludeTestAccountsFilters<T>(query: T): T {
  const q: any = query;
  return q
    .not('email', 'ilike', '%@tradehub.test')
    .not('email', 'ilike', 'emailtest_%')
    .neq('email', 'test4@gmail.com')
    .neq('email', 'test5@gmail.com')
    .not('name', 'ilike', 'QA %')
    .not('name', 'ilike', '% qa %')
    .not('name', 'ilike', '%manual premium qa%');
}
