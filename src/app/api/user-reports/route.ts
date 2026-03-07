import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['harassment', 'spam', 'scam', 'inappropriate_content', 'other'] as const;

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
    const reportedId = body.reportedId ?? body.reported_id;
    const conversationId = body.conversationId ?? body.conversation_id ?? null;
    const category = body.category;
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    const alsoBlock = !!body.alsoBlock;

    if (!reportedId || typeof reportedId !== 'string') {
      return NextResponse.json({ error: 'reportedId is required' }, { status: 400 });
    }

    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (reportedId === authUser.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const { data: report, error: reportErr } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: authUser.id,
        reported_id: reportedId,
        conversation_id: conversationId || null,
        category,
        notes,
        status: 'open',
      })
      .select()
      .single();

    if (reportErr) {
      console.error('user_reports POST error:', reportErr);
      return NextResponse.json({ error: reportErr.message }, { status: 500 });
    }

    if (alsoBlock) {
      const { error: blockErr } = await supabase.from('user_blocks').insert({
        blocker_id: authUser.id,
        blocked_id: reportedId,
      });
      if (blockErr && blockErr.code !== '23505') {
        console.error('user_blocks insert (report-and-block) error:', blockErr);
      }
    }

    return NextResponse.json({
      ok: true,
      report: {
        id: report.id,
        reporterId: report.reporter_id,
        reportedId: report.reported_id,
        conversationId: report.conversation_id,
        category: report.category,
        notes: report.notes,
        status: report.status,
        createdAt: report.created_at,
      },
      alsoBlocked: alsoBlock,
    });
  } catch (err) {
    console.error('user_reports API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
