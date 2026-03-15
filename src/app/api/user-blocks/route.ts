// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** GET: List blocks involving the current user (as blocker or blocked). */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authUser.id) {
      return NextResponse.json({ blocks: [] });
    }

    const { data: rows, error } = await (supabase as any)
      .from('user_blocks')
      .select('id, blocker_id, blocked_id, created_at')
      .or(`blocker_id.eq.${authUser.id},blocked_id.eq.${authUser.id}`);

    if (error) {
      console.error('user_blocks GET Supabase error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ blocks: [] });
    }

    const blocks = (rows ?? []).map((r) => ({
      id: r.id,
      blockerId: r.blocker_id,
      blockedId: r.blocked_id,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ blocks });
  } catch (err) {
    console.error('user_blocks GET uncaught error:', err);
    return NextResponse.json({ blocks: [] });
  }
}

/** POST: Create a block. Body: { blockedId }. */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const blockedId = body.blockedId ?? body.blocked_id;

    if (!blockedId || typeof blockedId !== 'string') {
      return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
    }

    if (blockedId === authUser.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const { data: row, error } = await (supabase as any)
      .from('user_blocks')
      .insert({
        blocker_id: authUser.id,
        blocked_id: blockedId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, block: { id: 'existing', blockerId: authUser.id, blockedId } });
      }
      console.error('user_blocks POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      block: {
        id: row.id,
        blockerId: row.blocker_id,
        blockedId: row.blocked_id,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error('user_blocks API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
