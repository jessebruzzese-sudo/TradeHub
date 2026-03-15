import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { buildWelcomeTemplateData } from '@/lib/email/email-template-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileErr || !profile?.email) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const result = await createEmailEvent({
      userId: profile.id,
      toEmail: profile.email,
      emailType: 'welcome',
      payload: buildWelcomeTemplateData({ name: profile.name }),
      idempotencyKey: `welcome:${profile.id}`,
      triggerSendImmediately: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to queue welcome email', eventId: result.eventId },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, eventId: result.eventId, alreadyExists: result.alreadyExists === true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

