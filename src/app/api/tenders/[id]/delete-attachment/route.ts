// @ts-nocheck - Supabase client type inference
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: tenderId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const bucket = body?.bucket as string | undefined;
  const path = body?.path as string | undefined;

  if (!bucket || !path) {
    return NextResponse.json({ message: 'Missing bucket/path.' }, { status: 400 });
  }

  // 1) Identify user (normal auth)
  const supabase = createServerSupabase();

  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !authUser) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  const userId = authUser.id;

  // 2) Verify ownership: tender.builder_id must match user
  const { data: tenderRow, error: tenderErr } = await supabase
    .from('tenders')
    .select('id, builder_id')
    .eq('id', tenderId)
    .single();

  if (tenderErr || !tenderRow) {
    return NextResponse.json({ message: 'Tender not found.' }, { status: 404 });
  }

  if (tenderRow.builder_id !== userId) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

  // 3) Safety: ensure path is under this tender folder
  // Expected: tenders/${tenderId}/shared/... or tenders/${tenderId}/trades/...
  if (!path.startsWith(`tenders/${tenderId}/`)) {
    return NextResponse.json({ message: 'Invalid path.' }, { status: 400 });
  }

  // 4) Delete with service role (bypass storage RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error: delErr } = await admin.storage.from(bucket).remove([path]);

  if (delErr) {
    console.error('[tenders] storage delete failed', delErr);
    return NextResponse.json({ message: 'Could not delete file.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
