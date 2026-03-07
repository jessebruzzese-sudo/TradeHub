import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/require-admin';

export const dynamic = 'force-dynamic';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ conversationId: string }> }
) {
  try {
    await requireAdmin();
    const { conversationId } = await ctx.params;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const supabase = serviceClient();

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, contractor_id, subcontractor_id, job_id, created_at')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('id, sender_id, text, is_system_message, created_at, attachments')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const userIds = new Set<string>();
    userIds.add(conv.contractor_id);
    userIds.add(conv.subcontractor_id);
    for (const m of messages ?? []) {
      userIds.add(m.sender_id);
    }

    const { data: reports } = await supabase
      .from('user_reports')
      .select('id, reporter_id, reported_id, category, notes, status, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    const reportUserIds = new Set<string>();
    for (const r of reports ?? []) {
      reportUserIds.add(r.reporter_id);
      reportUserIds.add(r.reported_id);
    }
    for (const id of reportUserIds) userIds.add(id);

    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', Array.from(userIds));

    const names: Record<string, string> = {};
    for (const u of users ?? []) {
      names[u.id] = u.name ?? 'Unknown';
    }

    return NextResponse.json({
      conversation: {
        id: conv.id,
        contractorId: conv.contractor_id,
        contractorName: names[conv.contractor_id] ?? 'Unknown',
        subcontractorId: conv.subcontractor_id,
        subcontractorName: names[conv.subcontractor_id] ?? 'Unknown',
        jobId: conv.job_id,
        createdAt: conv.created_at,
      },
      reports: (reports ?? []).map((r) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterName: names[r.reporter_id] ?? 'Unknown',
        reportedId: r.reported_id,
        reportedName: names[r.reported_id] ?? 'Unknown',
        category: r.category,
        notes: r.notes,
        status: r.status,
        createdAt: r.created_at,
      })),
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: names[m.sender_id] ?? 'Unknown',
        text: m.text,
        isSystemMessage: m.is_system_message ?? false,
        attachments: m.attachments ?? [],
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('Admin conversation fetch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
