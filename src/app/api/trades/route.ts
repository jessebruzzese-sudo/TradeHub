import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { loadActiveTrades } from '@/lib/trades/load-active-trades';

export const dynamic = 'force-dynamic';

/** Public catalog for trade selectors and filters. */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const trades = await loadActiveTrades(supabase);
    return NextResponse.json({ trades });
  } catch (e) {
    console.error('[api/trades] GET', e);
    return NextResponse.json({ error: 'Failed to load trades' }, { status: 500 });
  }
}
