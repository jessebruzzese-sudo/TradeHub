import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** Upper bound for dashboard count; matches visible listing RPC semantics. */
const MAX_LIST = 5000;

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ count: 0 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('primary_trade, additional_trades')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ count: 0 });
    }

    const trades = [
      profile.primary_trade,
      ...((profile.additional_trades as string[] | null) || []),
    ]
      .map((t) => String(t ?? '').trim())
      .filter(Boolean);

    if (trades.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const tradeFilter = trades.join('|');

    const { data: rows, error: rpcErr } = await supabase.rpc('get_jobs_visible_to_viewer', {
      viewer_id: user.id,
      trade_filter: tradeFilter,
      limit_count: MAX_LIST,
      offset_count: 0,
    });

    if (rpcErr) {
      console.warn('[api/dashboard/new-jobs] rpc failed:', rpcErr.message);
      return NextResponse.json({ count: 0 });
    }

    const count = Array.isArray(rows) ? rows.length : 0;
    return NextResponse.json({ count });
  } catch (err) {
    console.warn('[api/dashboard/new-jobs] failed:', err);
    return NextResponse.json({ count: 0 });
  }
}
