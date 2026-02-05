import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';

function authClient() {
  const cookieStore = cookies();
  return createServerClient(
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
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const supabaseAuth = authClient();
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseService = serviceClient();
  const { data: dbUser, error: dbErr } = await supabaseService
    .from('users')
    .select('id, email, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (dbErr || !dbUser) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  let customerId = dbUser.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email ?? user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabaseService
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  const origin = req.headers.get('origin') || req.headers.get('x-url') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const baseUrl = origin.replace(/\/$/, '');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/profile`,
  });

  const url = session.url ?? null;
  if (!url) {
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }

  return NextResponse.json({ url });
}
