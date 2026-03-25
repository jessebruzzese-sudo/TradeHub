import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { shouldSendEmailNow } from '@/lib/email/rollout';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://tradehub.com.au'
  );
}

function weekBucketKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function normalizeTrade(t: string): string {
  return t.trim().toLowerCase();
}

async function runDigest(request: NextRequest) {
  const secret =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    request.headers.get('x-cron-secret') ??
    '';
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceSupabase();
  const oneAccountEmail = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || null;
  const weekKey = weekBucketKey();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: users, error: usersErr } = await svc
    .from('users')
    .select('id, email, name, primary_trade, additional_trades, subcontractor_work_alerts_enabled, deleted_at')
    .eq('subcontractor_work_alerts_enabled', true)
    .is('deleted_at', null);

  if (usersErr) {
    return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
  }

  const userRows = (users || []).filter((u: any) => u.email);
  const scopedUsers = oneAccountEmail
    ? userRows.filter((u: any) => String(u.email).toLowerCase() === oneAccountEmail)
    : userRows;

  const jobsRes = await svc
    .from('jobs')
    .select('id, title, trade_category, location, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(200);

  if (jobsRes.error) {
    return NextResponse.json(
      { ok: false, error: jobsRes.error?.message || 'query_failed' },
      { status: 500 }
    );
  }

  let sent = 0;
  let queued = 0;
  let failed = 0;

  for (const u of scopedUsers as any[]) {
    const toEmail = String(u.email).trim().toLowerCase();
    const userTrades = getDisplayTradeListFromUserRow(u).map(normalizeTrade);

    if (userTrades.length === 0) continue;

    const opportunities: string[] = [];

    for (const j of (jobsRes.data || []) as any[]) {
      if (!j.trade_category) continue;
      if (!userTrades.includes(normalizeTrade(j.trade_category))) continue;
      opportunities.push(`${j.trade_category} job${j.location ? ` — ${j.location}` : ''}`);
      if (opportunities.length >= 3) break;
    }

    if (opportunities.length === 0) continue;

    const result = await createEmailEvent({
      userId: u.id,
      toEmail,
      emailType: 'weekly_opportunity_digest',
      payload: {
        firstName: u.name?.split?.(/\s+/)?.[0] || undefined,
        opportunities,
        jobsUrl: `${appBaseUrl()}/jobs`,
      },
      idempotencyKey: `weekly_digest:${weekKey}:${u.id}`,
      triggerSendImmediately: shouldSendEmailNow({
        emailType: 'weekly_opportunity_digest',
        toEmail,
      }),
    });

    if (result.ok) {
      if (result.sendTriggered) sent++;
      else queued++;
    } else {
      failed++;
      console.error('[cron weekly digest] failed', { userId: u.id, toEmail, error: result.error });
    }
  }

  return NextResponse.json({
    ok: true,
    totalUsers: scopedUsers.length,
    sent,
    queued,
    failed,
    oneAccountEmail,
    weekKey,
  });
}

export async function GET(request: NextRequest) {
  return runDigest(request);
}

export async function POST(request: NextRequest) {
  return runDigest(request);
}

