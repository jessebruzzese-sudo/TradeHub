export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe, getSiteUrl } from '@/lib/stripe';
import { createServerSupabase } from '@/lib/supabase-server';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST() {
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID?.trim();
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !priceId) {
    return NextResponse.json(
      { error: 'Stripe not configured', code: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured', code: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  const supabaseAuth = createServerSupabase();
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

  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl}/dashboard?upgraded=1`,
    cancel_url: `${siteUrl}/pricing`,
    metadata: { user_id: user.id, plan: 'premium' },
  });

  const url = session.url ?? null;
  if (!url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  return NextResponse.json({ url });
}
