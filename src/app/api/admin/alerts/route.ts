/**
 * GET /api/admin/alerts
 * Admin-only: recent listing_alert_sends rows for debugging.
 */
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';
import { adminAuthErrorToResponse, requireAdmin } from '@/lib/admin/require-admin';

export const dynamic = 'force-dynamic';

const LIMIT = 100;

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    return adminAuthErrorToResponse(err);
  }

  const supabase = createServiceSupabase();

  const { data: rows, error } = await (supabase as any)
    .from('listing_alert_sends')
    .select('created_at, listing_type, listing_id, recipient_email, trade_label, status, provider_message_id, error_message')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error('[admin/alerts]', error);
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
  }

  return NextResponse.json({ rows: rows ?? [] });
}
