import 'server-only';

import { createServiceSupabase } from '@/lib/supabase-server';
import type { TransactionalEmailPayload, TransactionalEmailType } from '@/lib/email/types';

type CreateEmailEventOptions<T extends TransactionalEmailType> = {
  userId?: string | null;
  toEmail: string;
  emailType: T;
  payload: TransactionalEmailPayload<T> & Record<string, unknown>;
  triggerSendImmediately?: boolean;
  idempotencyKey?: string;
};

type CreateEmailEventResult = {
  ok: boolean;
  eventId?: string;
  alreadyExists?: boolean;
  sendTriggered?: boolean;
  sendResponse?: unknown;
  error?: string;
};

async function maybeSendExistingEvent(params: {
  supabase: ReturnType<typeof createServiceSupabase>;
  eventId: string;
  status: string | null | undefined;
  triggerSendImmediately: boolean;
}): Promise<Pick<CreateEmailEventResult, 'ok' | 'sendTriggered' | 'sendResponse' | 'error'>> {
  if (!params.triggerSendImmediately || params.status === 'sent') {
    return { ok: true, sendTriggered: false };
  }

  try {
    const sendResponse = await invokeSendTransactionalEmail(params.eventId);
    return { ok: true, sendTriggered: true, sendResponse };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await (params.supabase as any)
      .from('email_events')
      .update({ status: 'failed', error_message: error })
      .eq('id', params.eventId);
    return { ok: false, sendTriggered: true, error };
  }
}

async function invokeSendTransactionalEmail(emailEventId: string): Promise<unknown> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase service env is missing');
  }

  const url = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-transactional-email`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      ...(process.env.EMAIL_PIPELINE_SECRET
        ? { 'x-internal-email-key': process.env.EMAIL_PIPELINE_SECRET }
        : {}),
    },
    body: JSON.stringify({ emailEventId }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err =
      (json && typeof json === 'object' && 'error' in json && (json as any).error) ||
      `Email function failed (${res.status})`;
    throw new Error(String(err));
  }
  return json;
}

export async function createEmailEvent<T extends TransactionalEmailType>(
  options: CreateEmailEventOptions<T>
): Promise<CreateEmailEventResult> {
  const supabase = createServiceSupabase();
  const triggerSendImmediately = options.triggerSendImmediately ?? true;
  const cleanToEmail = options.toEmail.trim().toLowerCase();
  if (!cleanToEmail) {
    return { ok: false, error: 'toEmail is required' };
  }

  const payload: Record<string, unknown> = { ...(options.payload as Record<string, unknown>) };
  if (options.idempotencyKey) {
    payload.idempotencyKey = options.idempotencyKey;
  }

  if (options.idempotencyKey) {
    const { data: existing } = await (supabase as any)
      .from('email_events')
      .select('id, status')
      .eq('email_type', options.emailType)
      .contains('payload', { idempotencyKey: options.idempotencyKey })
      .maybeSingle();

    if (existing?.id) {
      const existingSend = await maybeSendExistingEvent({
        supabase,
        eventId: existing.id,
        status: existing.status,
        triggerSendImmediately,
      });
      return {
        ok: existingSend.ok,
        eventId: existing.id,
        alreadyExists: true,
        sendTriggered: existingSend.sendTriggered,
        sendResponse: existingSend.sendResponse,
        error: existingSend.error,
      };
    }
  }

  const { data: inserted, error: insertErr } = await (supabase as any)
    .from('email_events')
    .insert({
      user_id: options.userId ?? null,
      to_email: cleanToEmail,
      email_type: options.emailType,
      status: 'pending',
      payload,
    })
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    const isUniqueViolation =
      (insertErr as any)?.code === '23505' ||
      String((insertErr as any)?.message || '').toLowerCase().includes('duplicate key');

    if (isUniqueViolation) {
      let existingQuery = (supabase as any)
        .from('email_events')
        .select('id, status')
        .eq('email_type', options.emailType)
        .eq('to_email', cleanToEmail)
        .order('created_at', { ascending: false })
        .limit(1);

      existingQuery =
        options.userId != null
          ? existingQuery.eq('user_id', options.userId)
          : existingQuery.is('user_id', null);

      const { data: existingRows } = await existingQuery;
      const existing = existingRows?.[0];

      if (existing?.id) {
        const existingSend = await maybeSendExistingEvent({
          supabase,
          eventId: existing.id,
          status: existing.status,
          triggerSendImmediately,
        });
        return {
          ok: existingSend.ok,
          eventId: existing.id,
          alreadyExists: true,
          sendTriggered: existingSend.sendTriggered,
          sendResponse: existingSend.sendResponse,
          error: existingSend.error,
        };
      }
    }

    return { ok: false, error: insertErr?.message || 'Failed to insert email event' };
  }

  const eventId: string = inserted.id;

  if (!triggerSendImmediately) {
    return { ok: true, eventId, sendTriggered: false };
  }

  try {
    const sendResponse = await invokeSendTransactionalEmail(eventId);
    return { ok: true, eventId, sendTriggered: true, sendResponse };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await (supabase as any)
      .from('email_events')
      .update({ status: 'failed', error_message: error })
      .eq('id', eventId);

    return {
      ok: false,
      eventId,
      sendTriggered: true,
      error,
    };
  }
}

