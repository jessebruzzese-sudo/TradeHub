import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe/server';
import { getPlanForPriceId } from '../../../../../lib/stripe/plans';
import { withAdmin } from '../../../../../lib/admin/with-admin';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function mapStripeStatusToDb(status: string): 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'trialing') return 'ACTIVE';
  if (s === 'past_due' || s === 'unpaid') return 'PAST_DUE';
  if (s === 'canceled' || s === 'incomplete_expired') return 'CANCELED';
  return 'NONE';
}

type StripeSubscription = Stripe.Subscription & { current_period_end?: number };

export const POST = withAdmin(async (req: Request) => {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    console.error('admin resync-stripe getStripe error:', error);
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { userId?: string };
    const userId = body.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = serviceClient();

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id,email,stripe_customer_id,stripe_subscription_id,active_plan,subscription_status')
      .eq('id', userId)
      .maybeSingle();

    if (userErr) {
      console.error('admin resync-stripe user lookup error:', userErr);
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let subscription: StripeSubscription | null = null;

    if (user.stripe_subscription_id) {
      const subRaw = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      subscription = subRaw as StripeSubscription;
    } else if (user.stripe_customer_id) {
      const list = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'all',
        limit: 1,
      });
      subscription = (list.data[0] as StripeSubscription) || null;
    }

    if (!subscription) {
      return NextResponse.json({ error: 'No Stripe subscription found for user' }, { status: 404 });
    }

    const priceId = subscription.items?.data?.[0]?.price?.id;
    const plan = priceId ? getPlanForPriceId(priceId) : null;
    const status = mapStripeStatusToDb(subscription.status);
    const renewsAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    const startedAt = subscription.created ? new Date(subscription.created * 1000).toISOString() : null;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null;

    const update: any = {
      subscription_status: status,
      subscription_renews_at: renewsAt,
      subscription_started_at: startedAt,
      subscription_canceled_at: canceledAt,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
    };

    if (plan) {
      update.active_plan = plan;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId)
      .select(
        'id,email,role,active_plan,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,complimentary_premium_until,stripe_customer_id,stripe_subscription_id'
      )
      .maybeSingle();

    if (updateErr) {
      console.error('admin resync-stripe update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update user from Stripe' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'User not found after update' }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('admin resync-stripe route error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
});

