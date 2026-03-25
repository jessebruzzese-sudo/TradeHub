/**
 * Server-side alert service: find eligible recipients and send email alerts
 * when a new job is published.
 */
import { createServiceSupabase } from '@/lib/supabase-server';
import { getTier } from '@/lib/plan-limits';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { shouldSendEmailNow } from '@/lib/email/rollout';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

export type SendListingAlertsResult = {
  listingId: string;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://tradehub.com.au'
  );
}

/** Normalise trade for matching (lowercase, trim). */
function normaliseTrade(t: string): string {
  return (t || '').trim().toLowerCase();
}

/** Check if user's trades overlap with listing trades. */
function tradesMatch(userTrades: string[], listingTrades: string[]): boolean {
  const listingSet = new Set(listingTrades.map(normaliseTrade));
  for (const t of userTrades) {
    if (listingSet.has(normaliseTrade(t))) return true;
  }
  return false;
}

export async function sendListingAlerts(listingId: string): Promise<SendListingAlertsResult> {
  const result: SendListingAlertsResult = {
    listingId,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const supabase = createServiceSupabase();

  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('id, title, description, trade_category, location, postcode, contractor_id')
      .eq('id', listingId)
      .maybeSingle();

    if (error || !job) {
      result.errors.push(`Job not found: ${listingId}`);
      return result;
    }

    const j = job as {
      id: string;
      contractor_id: string;
      title?: string;
      description?: string;
      trade_category?: string;
      location?: string;
      postcode?: string;
    };
    const ownerId = j.contractor_id;
    const listingTrades = [j.trade_category].filter((x): x is string => Boolean(x));
    const location = [j.location, j.postcode].filter(Boolean).join(', ') || null;

    const recipients = await getEligibleRecipients(supabase, listingTrades, ownerId);
    await sendToRecipients(
      supabase,
      {
        listingId,
        recipients,
        tradeLabel: j.trade_category ?? null,
        buildPayload: (recipient) => ({
          firstName: recipient.name?.split?.(/\s+/)?.[0] || undefined,
          trade: j.trade_category ?? 'General',
          location: location ?? 'Unknown',
          jobUrl: `${appBaseUrl()}/jobs/${j.id}`,
        }),
      },
      result
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(msg);
    console.error('[sendListingAlerts]', listingId, e);
  }

  return result;
}

type Recipient = { userId: string; email: string; tradeLabel: string; name?: string | null };

async function getEligibleRecipients(
  supabase: ReturnType<typeof createServiceSupabase>,
  listingTrades: string[],
  excludeOwnerId: string
): Promise<Recipient[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select(
      'id, email, name, primary_trade, additional_trades, subcontractor_work_alerts_enabled, deleted_at, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status, complimentary_premium_until, premium_until'
    )
    .eq('subcontractor_work_alerts_enabled', true)
    .neq('id', excludeOwnerId)
    .is('deleted_at', null);

  if (error || !users) return [];

  const ids = (users as { id: string }[]).map((u) => u.id).filter(Boolean);
  const validAuthIds = new Set<string>();
  if (ids.length > 0) {
    try {
      const { data: authRows, error: authErr } = await (supabase as any)
        .schema('auth')
        .from('users')
        .select('id')
        .in('id', ids);
      if (authErr) {
        for (const id of ids) validAuthIds.add(id);
      } else {
        for (const r of authRows ?? []) {
          if (r?.id) validAuthIds.add(r.id);
        }
      }
    } catch {
      for (const id of ids) validAuthIds.add(id);
    }
  }

  const recipients: Recipient[] = [];
  type UserRow = {
    id: string;
    email?: string;
    name?: string | null;
    primary_trade?: string;
    additional_trades?: string[];
  };

  for (const u of users as UserRow[]) {
    if (!validAuthIds.has(u.id)) continue;
    if (!u.email?.trim()) continue;
    if (getTier(u) !== 'premium') continue;

    const userTrades = getDisplayTradeListFromUserRow(u);

    if (!tradesMatch(userTrades, listingTrades)) continue;

    const tradeLabel = listingTrades[0] ?? '';
    recipients.push({ userId: u.id, email: u.email.trim(), tradeLabel, name: u.name ?? null });
  }

  return recipients;
}

async function sendToRecipients(
  supabase: ReturnType<typeof createServiceSupabase>,
  params: {
    listingId: string;
    buildPayload: (recipient: Recipient) => Record<string, unknown>;
    recipients: Recipient[];
    tradeLabel: string | null;
  },
  result: SendListingAlertsResult
): Promise<void> {
  for (const r of params.recipients) {
    const existing = await (supabase as any)
      .from('listing_alert_sends')
      .select('id')
      .eq('listing_type', 'job')
      .eq('listing_id', params.listingId)
      .eq('recipient_user_id', r.userId)
      .maybeSingle();

    if (existing?.data) {
      result.skipped++;
      continue;
    }

    const eventResult = await createEmailEvent({
      userId: r.userId,
      toEmail: r.email,
      emailType: 'job_alert',
      payload: {
        ...params.buildPayload(r),
        listingType: 'job',
        listingId: params.listingId,
      } as any,
      idempotencyKey: `job_alert:${params.listingId}:${r.userId}`,
      triggerSendImmediately: shouldSendEmailNow({
        emailType: 'job_alert',
        toEmail: r.email,
      }),
    });

    const status = eventResult.ok ? 'sent' : 'failed';
    const providerMessageId = eventResult.ok
      ? ((eventResult.sendResponse as any)?.providerMessageId ?? null)
      : null;
    const errorMessage = eventResult.ok ? null : eventResult.error ?? 'unknown_error';

    const insertRow = {
      listing_type: 'job',
      listing_id: params.listingId,
      recipient_user_id: r.userId,
      recipient_email: r.email,
      trade_label: params.tradeLabel,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
    };
    const { error: insertErr } = await (supabase as any).from('listing_alert_sends').insert(insertRow);

    if (insertErr) {
      if (insertErr.code === '23505') {
        result.skipped++;
      } else if (eventResult.ok) {
        result.sent++;
        result.errors.push(`Sent to ${r.email}, but log insert failed: ${insertErr.message}`);
      } else {
        result.failed++;
        result.errors.push(`Insert log failed for ${r.userId}: ${insertErr.message}`);
      }
      continue;
    }

    if (eventResult.ok) {
      result.sent++;
    } else {
      result.failed++;
      const errMsg = eventResult.error || 'unknown';
      result.errors.push(`Send failed for ${r.email}: ${errMsg}`);
    }
  }
}
