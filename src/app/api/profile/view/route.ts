import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const viewedUserId = typeof body?.viewedUserId === 'string' ? body.viewedUserId.trim() : '';

    if (!viewedUserId) {
      return NextResponse.json({ error: 'Missing viewedUserId' }, { status: 400 });
    }

    if (viewedUserId === user.id) {
      return NextResponse.json({ ok: true, skipped: 'self-view' });
    }

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

    const { data: existing } = await supabase
      .from('profile_views')
      .select('id')
      .eq('viewed_user_id', viewedUserId)
      .eq('viewer_user_id', user.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    const { error } = await supabase.from('profile_views').insert({
      viewed_user_id: viewedUserId,
      viewer_user_id: user.id,
    });

    if (error) {
      console.error('profile_views insert error:', error);
      return NextResponse.json(
        { error: 'Failed to log view' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, inserted: true });
  } catch (err: unknown) {
    console.error('profile/view error:', err);
    return NextResponse.json(
      { error: 'Failed to log view' },
      { status: 500 }
    );
  }
}
