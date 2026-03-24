const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function isLastActiveStale(lastActiveAt: string | null | undefined, now = new Date()): boolean {
  if (!lastActiveAt) return true;
  const parsed = new Date(lastActiveAt);
  if (!Number.isFinite(parsed.getTime())) return true;
  return now.getTime() - parsed.getTime() >= SIX_HOURS_MS;
}

export async function touchLastActiveIfStale(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('touch_last_active_if_stale', { p_user_id: userId });
  if (error) {
    console.warn('[activity] touch_last_active_if_stale RPC failed', error);
    return false;
  }
  return data === true;
}

