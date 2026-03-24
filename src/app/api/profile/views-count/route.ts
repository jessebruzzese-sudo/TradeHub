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
      // Non-critical metric: degrade gracefully instead of breaking dashboard with 500 noise.
      console.warn('profile_views count unavailable, returning 0:', error.message);
      return NextResponse.json({ viewsLast7Days: 0 });
    }

    return NextResponse.json({ viewsLast7Days: count ?? 0 });
  } catch (err: unknown) {
    console.warn('profile/views-count failed, returning 0:', err);
    return NextResponse.json({ viewsLast7Days: 0 });
  }
}
