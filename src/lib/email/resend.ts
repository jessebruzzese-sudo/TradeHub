/**
 * Resend email utility for TradeHub transactional emails.
 * Server-side only. Requires RESEND_API_KEY and ALERTS_FROM_EMAIL.
 */
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.ALERTS_FROM_EMAIL || process.env.EMAIL_FROM;
const fromName = process.env.ALERTS_FROM_NAME ?? 'TradeHub';

let client: Resend | null = null;

/** Check if Resend env vars are configured. Returns skip reason when missing. */
export function getResendEnvStatus(): { ready: true } | { ready: false; reason: string } {
  if (!apiKey?.trim()) return { ready: false, reason: 'missing_resend_env: RESEND_API_KEY not set' };
  if (!fromEmail?.trim()) {
    return { ready: false, reason: 'missing_resend_env: ALERTS_FROM_EMAIL or EMAIL_FROM not set' };
  }
  return { ready: true };
}

function getClient(): Resend | null {
  if (!apiKey?.trim()) return null;
  if (!fromEmail?.trim()) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }
  | { ok: false; skipped: true; reason: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const envStatus = getResendEnvStatus();
  if (!envStatus.ready) {
    return { ok: false, skipped: true, reason: envStatus.reason };
  }

  const resend = getClient();
  if (!resend) {
    return { ok: false, skipped: true, reason: 'missing_resend_env: config invalid' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      return { ok: false, error: error.message ?? String(error) };
    }
    return { ok: true, messageId: data?.id ?? '' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
