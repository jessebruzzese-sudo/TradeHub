// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isLikelyTestAccount } from '@/lib/test-account';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations
 * Body: { otherUserId }
 * Finds or creates the direct conversation for (currentUser, otherUserId).
 * Returns the conversation. Handles 23505 race by re-selecting existing.
 */
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
    const otherUserId = body?.otherUserId ?? body?.other_user_id;

    if (!otherUserId || typeof otherUserId !== 'string') {
      return NextResponse.json({ error: 'otherUserId required' }, { status: 400 });
    }

    if (otherUserId === authUser.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    const { data: otherUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', otherUserId)
      .maybeSingle();
    if (
      !otherUser ||
      isLikelyTestAccount({
        email: otherUser.email,
        name: otherUser.name,
      })
    ) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [p1, p2] = authUser.id < otherUserId ? [authUser.id, otherUserId] : [otherUserId, authUser.id];

    const { data: existing } = await supabase
      .from('conversations')
      .select('id, contractor_id, subcontractor_id, job_id, created_at, updated_at')
      .eq('contractor_id', p1)
      .eq('subcontractor_id', p2)
      .is('job_id', null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        conversation: {
          id: existing.id,
          contractorId: existing.contractor_id,
          subcontractorId: existing.subcontractor_id,
          jobId: existing.job_id,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at ?? existing.created_at,
        },
      });
    }

    const { data: created, error: createErr } = await supabase
      .from('conversations')
      .insert({
        contractor_id: p1,
        subcontractor_id: p2,
        job_id: null,
      })
      .select('id, contractor_id, subcontractor_id, job_id, created_at, updated_at')
      .single();

    if (createErr) {
      if (createErr.code === '23505') {
        const { data: raceExisting } = await supabase
          .from('conversations')
          .select('id, contractor_id, subcontractor_id, job_id, created_at, updated_at')
          .eq('contractor_id', p1)
          .eq('subcontractor_id', p2)
          .is('job_id', null)
          .maybeSingle();
        if (raceExisting) {
          return NextResponse.json({
            conversation: {
              id: raceExisting.id,
              contractorId: raceExisting.contractor_id,
              subcontractorId: raceExisting.subcontractor_id,
              jobId: raceExisting.job_id,
              createdAt: raceExisting.created_at,
              updatedAt: raceExisting.updated_at ?? raceExisting.created_at,
            },
          });
        }
      }
      console.error('conversations POST error:', createErr);
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    return NextResponse.json({
      conversation: {
        id: created.id,
        contractorId: created.contractor_id,
        subcontractorId: created.subcontractor_id,
        jobId: created.job_id,
        createdAt: created.created_at,
        updatedAt: created.updated_at ?? created.created_at,
      },
    });
  } catch (err) {
    console.error('conversations POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/conversations
 * Returns all conversations for the current user with participant info and last message.
 */
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

    const { data: convs, error: convErr } = await supabase
      .from('conversations')
      .select('id, contractor_id, subcontractor_id, job_id, created_at, updated_at')
      .or(`contractor_id.eq.${authUser.id},subcontractor_id.eq.${authUser.id}`)
      .order('updated_at', { ascending: false });

    if (convErr) {
      console.error('conversations GET error:', convErr);
      return NextResponse.json({ error: convErr.message }, { status: 500 });
    }

    if (!convs || convs.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = convs.map((c) => c.id);
    const otherUserIds = new Set<string>();
    const jobIds = new Set<string>();
    for (const c of convs) {
      const other = c.contractor_id === authUser.id ? c.subcontractor_id : c.contractor_id;
      otherUserIds.add(other);
      if (c.job_id) jobIds.add(c.job_id);
    }

    const [messagesRes, usersRes, jobsRes] = await Promise.all([
      supabase
        .from('messages')
        .select('id, conversation_id, sender_id, text, is_system_message, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('id, name, avatar, email')
        .in('id', Array.from(otherUserIds)),
      jobIds.size > 0
        ? supabase
            .from('jobs')
            .select('id, title, status')
            .in('id', Array.from(jobIds))
        : Promise.resolve({ data: [] as { id: string; title: string; status: string }[] }),
    ]);

    const messages = messagesRes.data ?? [];
    const users = usersRes.data ?? [];
    const jobs = jobsRes.data ?? [];

    const lastMessageByConv: Record<string, (typeof messages)[0]> = {};
    for (const m of messages) {
      if (!lastMessageByConv[m.conversation_id]) {
        lastMessageByConv[m.conversation_id] = m;
      }
    }

    const userMap: Record<string, { name: string; avatar: string | null }> = {};
    const visibleOtherIds = new Set<string>();
    for (const u of users) {
      const hidden = isLikelyTestAccount({ email: (u as any).email, name: u.name });
      if (hidden) continue;
      visibleOtherIds.add(u.id);
      userMap[u.id] = { name: u.name ?? 'Unknown', avatar: u.avatar ?? null };
    }

    const jobMap: Record<string, { title: string; status: string }> = {};
    for (const j of jobs) {
      jobMap[j.id] = { title: j.title ?? 'Job', status: j.status ?? 'open' };
    }

    const conversations = convs
      .filter((c) => {
        const otherId = c.contractor_id === authUser.id ? c.subcontractor_id : c.contractor_id;
        return visibleOtherIds.has(otherId);
      })
      .map((c) => {
      const otherId = c.contractor_id === authUser.id ? c.subcontractor_id : c.contractor_id;
      const other = userMap[otherId] ?? { name: 'Unknown', avatar: null };
      const lastMsg = lastMessageByConv[c.id];
      const job = c.job_id ? jobMap[c.job_id] : null;

      return {
        id: c.id,
        contractorId: c.contractor_id,
        subcontractorId: c.subcontractor_id,
        jobId: c.job_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at ?? c.created_at,
        otherUserId: otherId,
        otherUserName: other.name,
        otherUserAvatar: other.avatar,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              senderId: lastMsg.sender_id,
              text: lastMsg.text,
              isSystemMessage: lastMsg.is_system_message ?? false,
              createdAt: lastMsg.created_at,
            }
          : null,
        jobTitle: job?.title ?? null,
        jobStatus: job?.status ?? null,
      };
      });

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error('conversations API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
