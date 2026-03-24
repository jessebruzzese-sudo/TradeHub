import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { refreshProfileStrength } from '@/lib/profile-strength';

export const dynamic = 'force-dynamic';

/** POST — recompute profile strength for the signed-in user. */
export async function POST() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = await refreshProfileStrength(user.id);
  if (!res.ok) {
    return NextResponse.json({ error: res.error ?? 'Refresh failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
