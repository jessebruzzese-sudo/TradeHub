import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  adminAuthErrorResponseOrNull,
  requireAdmin,
} from '@/lib/admin/require-admin';

export const dynamic = 'force-dynamic';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const bucket = body?.bucket as string | undefined;
    const path = body?.path as string | undefined;

    if (!bucket || !path) {
      return NextResponse.json({ error: 'bucket and path required' }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 30); // 30 min

    if (error) {
      console.error('Admin signed URL error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    const auth = adminAuthErrorResponseOrNull(err);
    if (auth) return auth;
    console.error('Admin signed URL error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
