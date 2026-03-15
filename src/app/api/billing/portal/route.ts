import { NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { getAppUrl } from '@/lib/stripe';

export async function POST(req: Request) {
  if (MVP_FREE_MODE) {
    return NextResponse.json({ error: 'Billing disabled during MVP launch' }, { status: 403 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const supabaseAuth = createServerSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseService = createServiceSupabase();
  const { data: dbUser, error: dbErr } = await (supabaseService as any)
    .from('users')
    .select('id, email, name, business_name, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (dbErr || !dbUser) {
    if (dbErr) {
      console.error('[billing/portal] failed loading user profile', { userId: user.id, error: dbErr });
    }
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  let customerId = (dbUser.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    try {
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
        console.error('[billing/portal] failed to save stripe_customer_id', customerSaveError);
        return NextResponse.json({ error: 'Failed to prepare billing portal' }, { status: 500 });
      }
    } catch (error) {
      console.error('[billing/portal] failed creating customer', error);
      return NextResponse.json({ error: 'Failed to prepare billing portal' }, { status: 500 });
    }
  }

  const requestOrigin = req.headers.get('origin') || req.headers.get('x-url');
  const baseUrl = (requestOrigin || getAppUrl()).replace(/\/$/, '');

  let session: Awaited<ReturnType<typeof stripe.billingPortal.sessions.create>>;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/pricing`,
    });
  } catch (error) {
    console.error('[billing/portal] failed creating portal session', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }

  const url = session.url ?? null;
  if (!url) {
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }

  return NextResponse.json({ url });
}
