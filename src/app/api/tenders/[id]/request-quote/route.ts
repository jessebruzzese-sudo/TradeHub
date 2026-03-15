import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { buildQuoteRequestTemplateData } from '@/lib/email/email-template-data';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenderId } = await ctx.params;
    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.rpc('request_to_quote', { p_tender_id: tenderId });
    if (error) {
      const msg = String((error as any)?.message || '');
      if (msg.includes('not_authenticated')) {
        return NextResponse.json({ error: 'Please log in to request.' }, { status: 401 });
      }
      if (msg.includes('tender_not_found')) {
        return NextResponse.json({ error: 'Tender not found.' }, { status: 404 });
      }
      if (msg.includes('tender_not_anonymous')) {
        return NextResponse.json({ error: 'This tender is not anonymous.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Could not send request.' }, { status: 400 });
    }

    // Core state is already committed. Email is a best-effort side effect.
    try {
      const service = createServiceSupabase();
      const [{ data: tender }, { data: requester }] = await Promise.all([
        (service as any)
          .from('tenders')
          .select('id, project_name, builder_id')
          .eq('id', tenderId)
          .maybeSingle(),
        (service as any)
          .from('users')
          .select('id, name')
          .eq('id', authUser.id)
          .maybeSingle(),
      ]);

      if (tender?.builder_id && tender.builder_id !== authUser.id) {
        const { data: recipient } = await (service as any)
          .from('users')
          .select('id, email, name')
          .eq('id', tender.builder_id)
          .maybeSingle();

        if (recipient?.email) {
          await createEmailEvent({
            userId: recipient.id,
            toEmail: recipient.email,
            emailType: 'quote_request',
            payload: buildQuoteRequestTemplateData({
              recipientName: recipient.name,
              requesterName: requester?.name,
              tenderId,
            }),
            idempotencyKey: `quote_request:${tenderId}:${authUser.id}`,
            triggerSendImmediately: true,
          });
        }
      }
    } catch (emailErr) {
      console.error('[tenders/request-quote] email side effect failed', emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[tenders/request-quote] unexpected error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

