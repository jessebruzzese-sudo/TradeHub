/**
 * Label shown in messaging UI for the other participant (matches public profile preferences where possible).
 */
export function displayNameForMessagingParticipant(u: {
  name?: string | null;
  business_name?: string | null;
  show_business_name_on_profile?: boolean | null;
  email?: string | null;
}): string {
  const showBiz = u.show_business_name_on_profile === true;
  const biz = String(u.business_name ?? '').trim();
  const nm = String(u.name ?? '').trim();
  if (showBiz && biz) return biz;
  if (nm) return nm;
  if (biz) return biz;
  const email = String(u.email ?? '').trim();
  if (email.includes('@')) {
    const local = email.split('@')[0]?.trim();
    if (local) return local;
  }
  return 'Unknown';
}
