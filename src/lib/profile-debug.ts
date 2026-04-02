/**
 * Temporary diagnostics for profile links from discovery/search (development only).
 */
export function debugProfileCardData(label: string, profile: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'development') return;
  // eslint-disable-next-line no-console
  console.log('profile card data', label, profile);
  // eslint-disable-next-line no-console
  console.log('profile link id', profile.id, profile.user_id);
}
