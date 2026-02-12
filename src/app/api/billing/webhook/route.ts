import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';
import { getPlanForPriceId } from '@/lib/stripe/plans';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

type CheckoutSession = Stripe.Checkout.Session;
type StripeSubscription = Stripe.Subscription;
type StripeInvoice = Stripe.Invoice;
type StripeEvent = Stripe.Event;

/** Subscription shape includes current_period_end (Stripe API has it; types may lag). */
type SubscriptionWithPeriod = StripeSubscription & { current_period_end?: number };

/** Invoice shape includes subscription id (string or expandable). */
function getInvoiceSubscriptionId(invoice: StripeInvoice): string | null {
  const sub = (invoice as { subscription?: string | { id?: string } }).subscription;
  if (typeof sub === 'string') return sub;
  if (sub && typeof sub === 'object' && typeof sub.id === 'string') return sub.id;
  return null;
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
  // 'incomplete' and any unknown status default to NONE (do not treat incomplete as canceled)
  return 'NONE';
}

type SubscriptionUpdatePayload = {
  active_plan?: string;
  subscription_status: string;
  subscription_renews_at: string | null;
  subscription_started_at: string | null;
  subscription_canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

async function updateUserFromSubscription(
  supabase: ReturnType<typeof serviceClient>,
  userId: string | null,
  customerId: string | null,
  payload: SubscriptionUpdatePayload
) {
  const update = { ...payload };
  if (userId) {
    const { error } = await supabase.from('users').update(update).eq('id', userId);
    if (error) console.error('Billing webhook updateUserFromSubscription error (by user_id):', error);
    return;
  }
  if (customerId) {
    const { error } = await supabase.from('users').update(update).eq('stripe_customer_id', customerId);
    if (error) console.error('Billing webhook updateUserFromSubscription error (by stripe_customer_id):', error);
  }
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: CheckoutSession,
  supabase: ReturnType<typeof serviceClient>
) {
  const userId = (session.metadata?.user_id as string) || null;
  const customerId = session.customer as string | null;
  const subscriptionId = session.subscription as string | null;

  if (subscriptionId && typeof subscriptionId === 'string') {
    const subRaw = await stripe.subscriptions.retrieve(subscriptionId);
    const sub = subRaw as SubscriptionWithPeriod;
    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = priceId ? getPlanForPriceId(priceId) : null;
    const status = mapStripeStatusToDb(sub.status);
    const renewsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
    const startedAt = sub.created ? new Date(sub.created * 1000).toISOString() : null;

    const payload: SubscriptionUpdatePayload = {
      subscription_status: status,
      subscription_renews_at: renewsAt,
      subscription_started_at: startedAt,
      subscription_canceled_at: null,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    };
    if (plan !== null) payload.active_plan = plan;

    await updateUserFromSubscription(supabase, userId, customerId, payload);
  } else if (customerId && userId) {
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }
}

async function handleSubscriptionEvent(sub: StripeSubscription, supabase: ReturnType<typeof serviceClient>) {
  const customerId = sub.customer as string;
  const userId = (sub.metadata?.user_id as string) || null;
  const priceId = sub.items?.data?.[0]?.price?.id;
  const plan = priceId ? getPlanForPriceId(priceId) : null;
  const status = mapStripeStatusToDb(sub.status);
  const subWithPeriod = sub as SubscriptionWithPeriod;
  const renewsAt = subWithPeriod.current_period_end ? new Date(subWithPeriod.current_period_end * 1000).toISOString() : null;
  const startedAt = sub.created ? new Date(sub.created * 1000).toISOString() : null;
  const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null;

  const payload: SubscriptionUpdatePayload = {
    subscription_status: status,
    subscription_renews_at: renewsAt,
    subscription_started_at: startedAt,
    subscription_canceled_at: canceledAt,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
  };
  if (plan !== null) payload.active_plan = plan;

  await updateUserFromSubscription(supabase, userId, customerId, payload);
}

// TODO: Intentionally not called yet. Call from webhook handlers when ready to audit subscription changes.
async function insertSubscriptionHistory(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
  eventType: string,
  fromPlan: string | null,
  toPlan: string | null
) {
  try {
    await supabase.from('subscription_history').insert({
      user_id: userId,
      event_type: eventType,
      from_plan: fromPlan,
      to_plan: toPlan,
      payment_provider: 'stripe',
    });
  } catch {
    // best-effort
  }
}

export async function POST(req: Request) {
  if (MVP_FREE_MODE) {
    return NextResponse.json({ error: 'Billing disabled during MVP launch' }, { status: 403 });
  }
  if (!webhookSecret || !isStripeConfigured()) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const supabase = serviceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as CheckoutSession;
        await handleCheckoutSessionCompleted(stripe, session, supabase);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as StripeSubscription;
        await handleSubscriptionEvent(sub, supabase);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        const customerId = sub.customer as string;
        const userId = (sub.metadata?.user_id as string) || null;
        await updateUserFromSubscription(supabase, userId, customerId, {
          active_plan: 'NONE',
          subscription_status: 'CANCELED',
          subscription_renews_at: null,
          subscription_started_at: null,
          subscription_canceled_at: new Date().toISOString(),
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
        });
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await handleSubscriptionEvent(sub, supabase);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await handleSubscriptionEvent(sub, supabase);
        }
        break;
      }
      default:
        // Unhandled event type - respond 200 so Stripe doesn't retry
        break;
  }
  } catch (err) {
    console.error('Billing webhook handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
