import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  adminAuthErrorResponseOrNull,
  requireAdmin,
} from '@/lib/admin/require-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['reviewed', 'resolved', 'dismissed'] as const;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: reportId } = await ctx.params;

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const body = await request.json();
    const status = body?.status;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use: reviewed, resolved, dismissed' },
        { status: 400 }
      );
    }

    const supabase = serviceClient();
    const { data, error } = await (supabase as any)
      .from('user_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .select('id, status')
      .single();

    if (error) {
      console.error('Admin report status update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const auth = adminAuthErrorResponseOrNull(err);
    if (auth) return auth;
    console.error('Admin report status error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
