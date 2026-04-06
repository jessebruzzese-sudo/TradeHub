import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';
import { createServiceSupabase } from '@/lib/supabase-server';
import {
  adminAuthErrorResponseOrNull,
  requireAdmin,
} from '@/lib/admin/require-admin';

type ConversationRow = Pick<Database['public']['Tables']['conversations']['Row'], 'id' | 'contractor_id' | 'subcontractor_id' | 'job_id' | 'created_at'>;
type MessageRow = Pick<Database['public']['Tables']['messages']['Row'], 'id' | 'sender_id' | 'text' | 'is_system_message' | 'created_at' | 'attachments'>;
type UserReportRow = { id: string; reporter_id: string; reported_id: string; category: string; notes: string | null; status: string; created_at: string };
type UserRow = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name'>;

export const dynamic = 'force-dynamic';

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

    const supabase = createServiceSupabase();

    const convResult = await supabase
      .from('conversations')
      .select('id, contractor_id, subcontractor_id, job_id, created_at')
      .eq('id', conversationId)
      .single();
    const conv = convResult.data as ConversationRow | null;
    const convError = convResult.error;

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messagesResult = await supabase
      .from('messages')
      .select('id, sender_id, text, is_system_message, created_at, attachments')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    const messages = messagesResult.data as MessageRow[] | null;

    const userIds = new Set<string>();
    userIds.add(conv.contractor_id);
    userIds.add(conv.subcontractor_id);
    for (const m of messages ?? []) {
      userIds.add(m.sender_id);
    }

    const reportsResult = await (supabase as any)
      .from('user_reports')
      .select('id, reporter_id, reported_id, category, notes, status, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });
    const reports = reportsResult.data as UserReportRow[] | null;

    const reportUserIds = new Set<string>();
    for (const r of reports ?? []) {
      reportUserIds.add(r.reporter_id);
      reportUserIds.add(r.reported_id);
    }
    for (const id of reportUserIds) userIds.add(id);

    const usersResult = await supabase
      .from('users')
      .select('id, name')
      .in('id', Array.from(userIds));
    const users = usersResult.data as UserRow[] | null;

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
    const auth = adminAuthErrorResponseOrNull(err);
    if (auth) return auth;
    console.error('Admin conversation fetch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
