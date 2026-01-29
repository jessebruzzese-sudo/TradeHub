import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function normalizeAbn(input: string) {
  return (input || '').replace(/\s+/g, '');
}

function isValidAbn(abn: string) {
  return /^[0-9]{11}$/.test(abn);
}

// MVP stub — replace later with real ABR lookup
async function lookupAbn(abn: string) {
  return {
    ok: true,
    businessName: 'Verified Business (MVP)',
  };
}

export async function POST(req: Request) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const abn = normalizeAbn(body?.abn);

  if (!isValidAbn(abn)) {
    return NextResponse.json({ error: 'ABN must be 11 digits' }, { status: 400 });
  }

  const lookup = await lookupAbn(abn);
  if (!lookup.ok) {
    return NextResponse.json({ error: 'ABN could not be verified' }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Audit trail
  await admin.from('abn_verifications').insert({
    user_id: user.id,
    abn,
    business_name: lookup.businessName,
    status: 'verified',
    provider: 'abr',
  });

  // Update user profile
  const { error } = await admin
    .from('users')
    .update({
      abn,
      business_name: lookup.businessName,
      abn_status: 'verified',
      abn_verified_at: new Date().toISOString(),
      abn_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    abn,
    businessName: lookup.businessName,
    status: 'verified',
  });
}
