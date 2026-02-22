import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count, error } = await supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('viewed_user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error) {
      console.error('profile_views count error:', error);
      return NextResponse.json(
        { error: 'Failed to load views count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ viewsLast7Days: count ?? 0 });
  } catch (err: unknown) {
    console.error('profile/views-count error:', err);
    return NextResponse.json(
      { error: 'Failed to load views count' },
      { status: 500 }
    );
  }
}
