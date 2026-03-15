import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { shouldSendEmailNow } from '@/lib/email/rollout';

type Body = {
  userId?: string;
  email?: string;
  name?: string;
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
    const body = (await request.json().catch(() => ({}))) as Body;
    const userId = body.userId?.trim();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();

    if (!userId || !email) {
      return NextResponse.json({ ok: false, error: 'userId and email are required' }, { status: 400 });
    }

    const supabase = createServiceSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    const toEmail = String(user.email).trim().toLowerCase();
    const firstName = (name || user.name || '').split(/\s+/)[0] || undefined;
    const verifyUrl = `${appBaseUrl()}/verify`;

    const result = await createEmailEvent({
      userId: user.id,
      toEmail,
      emailType: 'account_verification',
      payload: {
        firstName,
        verifyUrl,
      },
      idempotencyKey: `account_verification:${user.id}`,
      triggerSendImmediately: shouldSendEmailNow({
        emailType: 'account_verification',
        toEmail,
      }),
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to queue account verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, eventId: result.eventId, alreadyExists: result.alreadyExists === true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

