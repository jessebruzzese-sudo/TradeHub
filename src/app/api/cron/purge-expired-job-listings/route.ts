import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorize(request: NextRequest): boolean {
  const secret =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    request.headers.get('x-cron-secret') ??
    '';
  const expected = process.env.CRON_SECRET?.trim();
  return Boolean(expected && secret === expected);
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceSupabase();
  const { data, error } = await svc.rpc('purge_expired_job_listings');

  if (error) {
    console.error('[cron purge-expired-job-listings]', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const raw = data as string | number | null;
  const deleted = typeof raw === 'number' ? raw : raw != null ? Number(raw) : 0;
  return NextResponse.json({
    ok: true,
    deletedRows: Number.isFinite(deleted) ? deleted : 0,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
