// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { isLikelyTestAccount } from '@/lib/test-account';
import { displayNameForMessagingParticipant } from '@/lib/messaging-participant-display';

export const dynamic = 'force-dynamic';

const MESSAGING_USER_COLS =
  'id, name, avatar, email, business_name, show_business_name_on_profile';

async function fetchMessagingParticipantRow(
  otherUserId: string,
  supabase: ReturnType<typeof createServerSupabase>
) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createServiceSupabase();
      const { data, error } = await admin
        .from('users')
        .select(MESSAGING_USER_COLS)
        .eq('id', otherUserId)
        .maybeSingle();
      if (!error && data) return data;
    } catch {
      // fall through
    }
  }
  const { data } = await supabase.from('users').select(MESSAGING_USER_COLS).eq('id', otherUserId).maybeSingle();
  return data ?? null;
}

/**
 * GET /api/messages?conversationId=<id>
 * Returns messages for a conversation. Only participants can load.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') ?? searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, contractor_id, subcontractor_id, job_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant =
      conv.contractor_id === authUser.id || conv.subcontractor_id === authUser.id;
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    const otherUserId = conv.contractor_id === authUser.id ? conv.subcontractor_id : conv.contractor_id;

    const [{ data: messages, error: msgErr }, otherUser] = await Promise.all([
      supabase
        .from('messages')
        .select('id, conversation_id, sender_id, text, attachments, is_system_message, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
      fetchMessagingParticipantRow(otherUserId, supabase),
    ]);

    if (msgErr) {
      console.error('messages GET error:', msgErr);
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    if (
      otherUser &&
      isLikelyTestAccount({ email: (otherUser as any).email, name: (otherUser as any).name })
    ) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const formatted = (messages ?? []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      text: m.text,
      attachments: m.attachments ?? [],
      isSystemMessage: m.is_system_message ?? false,
      createdAt: m.created_at,
    }));

    return NextResponse.json({
      messages: formatted,
      conversation: {
        id: conv.id,
        contractorId: conv.contractor_id,
        subcontractorId: conv.subcontractor_id,
        jobId: conv.job_id,
        otherUserId,
        otherUserName: displayNameForMessagingParticipant(
          otherUser ?? { name: null, business_name: null, show_business_name_on_profile: null, email: null }
        ),
        otherUserAvatar: otherUser?.avatar ?? null,
      },
    });
  } catch (err) {
    console.error('messages API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
