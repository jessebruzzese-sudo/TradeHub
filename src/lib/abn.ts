export function isAbnVerified(u: any): boolean {
  if (!u) return false;

  const status = String(u.abnStatus ?? u.abn_status ?? '')
    .trim()
    .toUpperCase();

  // Verified if status says VERIFIED
  if (status === 'VERIFIED') return true;

  // Verified if we have a verified timestamp (either camelCase or snake_case)
  if (u.abnVerifiedAt ?? u.abn_verified_at) return true;

  // Verified if a boolean flag exists
  if (u.abnVerified === true || u.abn_verified === true) return true;

  return false;
}

export function abnLabel(u: any): 'verified' | 'unverified' {
  return isAbnVerified(u) ? 'verified' : 'unverified';
}
