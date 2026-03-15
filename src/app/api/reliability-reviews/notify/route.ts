import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { shouldSendEmailNow } from '@/lib/email/rollout';

type NotifyBody = {
  recipientId?: string;
  jobId?: string;
};

export const dynamic = 'force-dynamic';

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://tradehub.com.au'
  );
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as NotifyBody;
    const recipientId = body.recipientId?.trim();
    const jobId = body.jobId?.trim();

    if (!recipientId || !jobId) {
      return NextResponse.json({ ok: false, error: 'recipientId and jobId are required' }, { status: 400 });
    }

    if (recipientId === authUser.id) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const service = createServiceSupabase();
    const { data: recipient, error: recipientErr } = await (service as any)
      .from('users')
      .select('id, email, name')
      .eq('id', recipientId)
      .maybeSingle();

    if (recipientErr || !recipient?.email) {
      return NextResponse.json({ ok: false, error: 'Recipient not found' }, { status: 404 });
    }

    const toEmail = String(recipient.email).trim().toLowerCase();
    const result = await createEmailEvent({
      userId: recipient.id,
      toEmail,
      emailType: 'reliability_review',
      payload: {
        firstName: recipient.name?.split?.(/\s+/)?.[0] || undefined,
        reviewsUrl: `${appBaseUrl()}/profile/reviews`,
      },
      idempotencyKey: `reliability_review:${jobId}:${authUser.id}:${recipient.id}`,
      triggerSendImmediately: shouldSendEmailNow({
        emailType: 'reliability_review',
        toEmail,
      }),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'Failed to queue email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, eventId: result.eventId, alreadyExists: result.alreadyExists === true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

