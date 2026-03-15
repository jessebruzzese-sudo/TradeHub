import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { shouldSendEmailNow } from '@/lib/email/rollout';

type ForgotPasswordPayload = {
  email?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ForgotPasswordPayload;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServiceSupabase();
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('[forgot-password] user lookup failed:', lookupError);
      return NextResponse.json({ error: 'Unable to process reset request' }, { status: 500 });
    }

    if (!existingUser) {
      return NextResponse.json({ error: 'Email does not exist' }, { status: 404 });
    }

    const appBaseUrl =
      process.env.APP_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      'https://tradehub.com.au';

    let resetUrl = `${appBaseUrl}/reset-password`;
    try {
      const { data: linkData, error: linkError } = await (supabase.auth as any).admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${appBaseUrl}/reset-password`,
        },
      });
      if (linkError) throw linkError;

      const maybeUrl =
        linkData?.properties?.action_link ||
        linkData?.action_link ||
        linkData?.properties?.url ||
        null;
      if (typeof maybeUrl === 'string' && maybeUrl.trim()) {
        resetUrl = maybeUrl.trim();
      }
    } catch (generateErr) {
      // Fall back to a generic URL if auth link generation is unavailable in environment.
      console.warn('[forgot-password] generateLink unavailable, using fallback URL', generateErr);
    }

    const result = await createEmailEvent({
      userId: existingUser.id,
      toEmail: email,
      emailType: 'password_reset',
      payload: {
        firstName: (existingUser as any)?.name?.split?.(/\s+/)?.[0] || undefined,
        resetUrl,
      },
      idempotencyKey: `password_reset:${existingUser.id}:${new Date().toISOString().slice(0, 16)}`,
      triggerSendImmediately: shouldSendEmailNow({
        emailType: 'password_reset',
        toEmail: email,
      }),
    });

    if (!result.ok) {
      console.error('[forgot-password] reset email queue failed:', result.error);
      return NextResponse.json({ error: 'Unable to send reset link' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, eventId: result.eventId });
  } catch (error) {
    console.error('[forgot-password] invalid request:', error);
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
