export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { getAppUrl } from '@/lib/stripe';
import { getStripe } from '@/lib/stripe/server';
import { getPremiumPriceId } from '@/lib/stripe/plans';
import { hasPremiumAccess } from '@/lib/billing/has-premium-access';

export async function POST() {
  const priceId = getPremiumPriceId();
  if (!priceId) {
    return NextResponse.json(
      { error: 'Stripe premium price is not configured', code: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: 'Stripe is not configured', code: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  const supabaseAuth = createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseService = createServiceSupabase();
  const { data: dbUser, error: dbUserError } = await (supabaseService as any)
    .from('users')
    .select('id, email, name, business_name, plan, subscription_status, complimentary_premium_until, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (dbUserError || !dbUser) {
    if (dbUserError) {
      console.error('[billing/create-checkout-session] failed loading user profile', {
        userId: user.id,
        error: dbUserError,
      });
    }
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  if (hasPremiumAccess(dbUser)) {
    return NextResponse.json(
      { error: 'Your account is already on Premium.' },
      { status: 400 }
    );
  }

  let customerId = (dbUser.stripe_customer_id as string | null) ?? null;
  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email ?? user.email ?? undefined,
        name: [dbUser.name, dbUser.business_name].filter(Boolean).join(' ') || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      const { error: customerSaveError } = await (supabaseService as any)
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (customerSaveError) {
        console.error('[billing/create-checkout-session] failed to save stripe_customer_id', customerSaveError);
        return NextResponse.json({ error: 'Failed to prepare checkout' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('[billing/create-checkout-session] failed creating customer', error);
    return NextResponse.json({ error: 'Failed to prepare checkout' }, { status: 500 });
  }

  const appUrl = getAppUrl();
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/pricing?billing=success`,
      cancel_url: `${appUrl}/pricing?billing=cancelled`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });
  } catch (error) {
    console.error('[billing/create-checkout-session] failed creating checkout session', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
