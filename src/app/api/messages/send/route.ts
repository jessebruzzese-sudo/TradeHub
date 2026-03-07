import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BLOCKED_ERROR = 'You cannot send messages in this conversation.';

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
    let conversationId = body.conversationId ?? body.conversation_id;
    const contractorId = body.contractorId ?? body.contractor_id;
    const subcontractorId = body.subcontractorId ?? body.subcontractor_id;
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (!conversationId && (!contractorId || !subcontractorId)) {
      return NextResponse.json({ error: 'conversationId or (contractorId and subcontractorId) required' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Message is too long (max 5000 characters)' }, { status: 400 });
    }

    let conv: { id: string; contractor_id: string; subcontractor_id: string } | null = null;

    if (conversationId) {
      const { data, error: convErr } = await supabase
        .from('conversations')
        .select('id, contractor_id, subcontractor_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!convErr) conv = data;
    }

    if (!conv && contractorId && subcontractorId) {
      const [p1, p2] =
        contractorId < subcontractorId ? [contractorId, subcontractorId] : [subcontractorId, contractorId];
      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert({
          contractor_id: p1,
          subcontractor_id: p2,
          job_id: null,
        })
        .select('id, contractor_id, subcontractor_id')
        .single();
      if (!createErr && created) {
        conv = created;
      } else if (createErr?.code === '23505') {
        const { data: raceExisting } = await supabase
          .from('conversations')
          .select('id, contractor_id, subcontractor_id')
          .eq('contractor_id', p1)
          .eq('subcontractor_id', p2)
          .is('job_id', null)
          .maybeSingle();
        if (raceExisting) conv = raceExisting;
      }
    }

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    conversationId = conv.id;

    const isParticipant =
      conv.contractor_id === authUser.id || conv.subcontractor_id === authUser.id;
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    const recipientId =
      conv.contractor_id === authUser.id ? conv.subcontractor_id : conv.contractor_id;

    const [res1, res2] = await Promise.all([
      supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', recipientId)
        .eq('blocked_id', authUser.id)
        .maybeSingle(),
      supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', authUser.id)
        .eq('blocked_id', recipientId)
        .maybeSingle(),
    ]);

    if (res1.data || res2.data) {
      return NextResponse.json({ error: BLOCKED_ERROR }, { status: 403 });
    }

    const { data: message, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: authUser.id,
        text,
        is_system_message: false,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '42501' || insertErr.message?.toLowerCase().includes('policy')) {
        return NextResponse.json({ error: BLOCKED_ERROR }, { status: 403 });
      }
      console.error('Message insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const response: Record<string, unknown> = {
      ok: true,
      message: {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        text: message.text,
        isSystemMessage: message.is_system_message ?? false,
        createdAt: message.created_at,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Messages send API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
