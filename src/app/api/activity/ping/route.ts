import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { touchLastActiveIfStale } from '@/lib/activity/touch-last-active';
import { refreshProfileStrength } from '@/lib/profile-strength';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createServerSupabase() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updated = await touchLastActiveIfStale(supabase, user.id);
  if (updated) {
    await refreshProfileStrength(user.id);
  }
  return NextResponse.json({ ok: true, updated });
}

