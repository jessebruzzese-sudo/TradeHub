// @ts-nocheck - Supabase client type inference
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin/require-admin';

export const dynamic = 'force-dynamic';

async function getUserNames(supabase: ReturnType<typeof createServiceSupabase>, ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from('users')
    .select('id, name')
    .in('id', unique);
  const map: Record<string, string> = {};
  for (const u of data ?? []) {
    map[u.id] = u.name ?? 'Unknown';
  }
  return map;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await ctx.params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = createServiceSupabase();

    const [
      { data: reportsReceived },
      { data: reportsSubmitted },
      { data: blocksByUser },
      { data: blocksOfUser },
    ] = await Promise.all([
      (supabase as any)
        .from('user_reports')
        .select('id, reporter_id, reported_id, conversation_id, category, notes, status, created_at')
        .eq('reported_id', userId)
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('user_reports')
        .select('id, reporter_id, reported_id, conversation_id, category, status, created_at')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('user_blocks')
        .select('id, blocker_id, blocked_id, created_at')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('user_blocks')
        .select('id, blocker_id, blocked_id, created_at')
        .eq('blocked_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    const allUserIds = new Set<string>();
    for (const r of reportsReceived ?? []) {
      allUserIds.add(r.reporter_id);
    }
    for (const r of reportsSubmitted ?? []) {
      allUserIds.add(r.reported_id);
    }
    for (const b of blocksByUser ?? []) {
      allUserIds.add(b.blocked_id);
    }
    for (const b of blocksOfUser ?? []) {
      allUserIds.add(b.blocker_id);
    }
    const names = await getUserNames(supabase, Array.from(allUserIds));

    return NextResponse.json({
      reportsReceived: (reportsReceived ?? []).map((r) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterName: names[r.reporter_id] ?? 'Unknown',
        reportedId: r.reported_id,
        conversationId: r.conversation_id,
        category: r.category,
        notes: r.notes,
        status: r.status,
        createdAt: r.created_at,
      })),
      reportsSubmitted: (reportsSubmitted ?? []).map((r) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reportedId: r.reported_id,
        reportedName: names[r.reported_id] ?? 'Unknown',
        conversationId: r.conversation_id,
        category: r.category,
        status: r.status,
        createdAt: r.created_at,
      })),
      blocksByUser: (blocksByUser ?? []).map((b) => ({
        id: b.id,
        blockedId: b.blocked_id,
        blockedName: names[b.blocked_id] ?? 'Unknown',
        createdAt: b.created_at,
      })),
      blocksOfUser: (blocksOfUser ?? []).map((b) => ({
        id: b.id,
        blockerId: b.blocker_id,
        blockerName: names[b.blocker_id] ?? 'Unknown',
        createdAt: b.created_at,
      })),
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('Admin messaging-safety error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
