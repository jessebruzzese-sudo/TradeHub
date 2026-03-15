import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import {
  buildAccountVerificationTemplate,
  type AccountVerificationTemplateInput,
} from './templates/account-verification.ts';
import {
  buildWelcomeTemplate,
  type WelcomeTemplateInput,
} from './templates/welcome.ts';
import {
  buildPremiumUpgradedTemplate,
  type PremiumUpgradedTemplateInput,
} from './templates/premium-upgraded.ts';
import {
  buildPasswordResetTemplate,
  type PasswordResetTemplateInput,
} from './templates/password-reset.ts';
import {
  buildPaymentReceiptTemplate,
  type PaymentReceiptTemplateInput,
} from './templates/payment-receipt.ts';
import {
  buildPaymentFailedTemplate,
  type PaymentFailedTemplateInput,
} from './templates/payment-failed.ts';
import {
  buildJobInviteTemplate,
  type JobInviteTemplateInput,
} from './templates/job-invite.ts';
import {
  buildJobAlertTemplate,
  type JobAlertTemplateInput,
} from './templates/job-alert.ts';
import {
  buildTenderAlertTemplate,
  type TenderAlertTemplateInput,
} from './templates/tender-alert.ts';
import {
  buildQuoteRequestTemplate,
  type QuoteRequestTemplateInput,
} from './templates/quote-request.ts';
import {
  buildHireConfirmedTemplate,
  type HireConfirmedTemplateInput,
} from './templates/hire-confirmed.ts';
import {
  buildNewMessageTemplate,
  type NewMessageTemplateInput,
} from './templates/new-message.ts';
import {
  buildAbnVerifiedTemplate,
  type AbnVerifiedTemplateInput,
} from './templates/abn-verified.ts';
import {
  buildReliabilityReviewTemplate,
  type ReliabilityReviewTemplateInput,
} from './templates/reliability-review.ts';
import {
  buildWeeklyOpportunityDigestTemplate,
  type WeeklyOpportunityDigestTemplateInput,
} from './templates/weekly-opportunity-digest.ts';
import type { EmailTemplateResult } from './templates/common.ts';

type EmailType =
  | 'account_verification'
  | 'welcome'
  | 'password_reset'
  | 'premium_upgraded'
  | 'payment_receipt'
  | 'payment_failed'
  | 'job_invite'
  | 'job_alert'
  | 'tender_alert'
  | 'quote_request'
  | 'hire_confirmed'
  | 'new_message'
  | 'abn_verified'
  | 'reliability_review'
  | 'weekly_opportunity_digest';

type IncomingBody = {
  emailEventId?: string;
  userId?: string;
  toEmail?: string;
  emailType?: EmailType;
  payload?: Record<string, unknown>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-internal-email-key',
};

function buildTemplate(emailType: EmailType, payload: Record<string, unknown>): EmailTemplateResult {
  switch (emailType) {
    case 'account_verification':
      return buildAccountVerificationTemplate(payload as unknown as AccountVerificationTemplateInput);
    case 'welcome':
      return buildWelcomeTemplate(payload as unknown as WelcomeTemplateInput);
    case 'password_reset':
      return buildPasswordResetTemplate(payload as unknown as PasswordResetTemplateInput);
    case 'premium_upgraded':
      return buildPremiumUpgradedTemplate(payload as unknown as PremiumUpgradedTemplateInput);
    case 'payment_receipt':
      return buildPaymentReceiptTemplate(payload as unknown as PaymentReceiptTemplateInput);
    case 'payment_failed':
      return buildPaymentFailedTemplate(payload as unknown as PaymentFailedTemplateInput);
    case 'job_invite':
      return buildJobInviteTemplate(payload as unknown as JobInviteTemplateInput);
    case 'job_alert':
      return buildJobAlertTemplate(payload as unknown as JobAlertTemplateInput);
    case 'tender_alert':
      return buildTenderAlertTemplate(payload as unknown as TenderAlertTemplateInput);
    case 'quote_request':
      return buildQuoteRequestTemplate(payload as unknown as QuoteRequestTemplateInput);
    case 'hire_confirmed':
      return buildHireConfirmedTemplate(payload as unknown as HireConfirmedTemplateInput);
    case 'new_message':
      return buildNewMessageTemplate(payload as unknown as NewMessageTemplateInput);
    case 'abn_verified':
      return buildAbnVerifiedTemplate(payload as unknown as AbnVerifiedTemplateInput);
    case 'reliability_review':
      return buildReliabilityReviewTemplate(payload as unknown as ReliabilityReviewTemplateInput);
    case 'weekly_opportunity_digest':
      return buildWeeklyOpportunityDigestTemplate(
        payload as unknown as WeeklyOpportunityDigestTemplateInput
      );
    default:
      throw new Error(`Unsupported emailType: ${emailType}`);
  }
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string; error?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: body?.message || `Resend API error (${res.status})` };
  }
  return { id: body?.id as string | undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = `TradeHub <${Deno.env.get('EMAIL_FROM') || 'hello@tradehub.com.au'}>`;

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'missing_supabase_env' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'missing_resend_api_key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
    const internalKey = req.headers.get('x-internal-email-key')?.trim();
    const expectedInternalKey = Deno.env.get('EMAIL_PIPELINE_SECRET')?.trim();
    const isServiceAuth = authHeader && authHeader === serviceKey;
    const isInternalAuth = !!expectedInternalKey && internalKey === expectedInternalKey;
    if (!isServiceAuth && !isInternalAuth) {
      return new Response(
        JSON.stringify({ ok: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as IncomingBody;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let eventId = body.emailEventId;
    let userId = body.userId ?? null;
    let toEmail = body.toEmail?.trim().toLowerCase() ?? '';
    let emailType = body.emailType;
    let payload = (body.payload || {}) as Record<string, unknown>;

    if (eventId) {
      const { data: row, error } = await supabase
        .from('email_events')
        .select('id, user_id, to_email, email_type, status, payload')
        .eq('id', eventId)
        .maybeSingle();

      if (error || !row) {
        return new Response(
          JSON.stringify({ ok: false, error: 'email_event_not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (row.status === 'sent') {
        return new Response(
          JSON.stringify({ ok: true, emailEventId: row.id, alreadySent: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = row.user_id;
      toEmail = row.to_email;
      emailType = row.email_type as EmailType;
      payload = (row.payload || {}) as Record<string, unknown>;
    } else {
      if (!emailType || !toEmail) {
        return new Response(
          JSON.stringify({ ok: false, error: 'emailEventId OR (emailType + toEmail) required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from('email_events')
        .insert({
          user_id: userId,
          to_email: toEmail,
          email_type: emailType,
          status: 'pending',
          payload,
        })
        .select('id')
        .single();

      if (insertError || !inserted?.id) {
        return new Response(
          JSON.stringify({ ok: false, error: insertError?.message || 'failed_to_create_email_event' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      eventId = inserted.id;
    }

    const template = buildTemplate(emailType as EmailType, payload);
    const provider = await sendViaResend({
      apiKey: resendApiKey,
      from: emailFrom,
      to: toEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (provider.error) {
      await supabase
        .from('email_events')
        .update({
          status: 'failed',
          error_message: provider.error,
        })
        .eq('id', eventId);

      return new Response(
        JSON.stringify({ ok: false, emailEventId: eventId, error: provider.error }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('email_events')
      .update({
        status: 'sent',
        provider_message_id: provider.id ?? null,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', eventId);

    return new Response(
      JSON.stringify({
        ok: true,
        emailEventId: eventId,
        providerMessageId: provider.id ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

