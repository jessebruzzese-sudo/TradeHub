export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getPremiumPriceId } from '@/lib/stripe/plans';
import { createEmailEvent } from '@/lib/email/create-email-event';
import { buildPremiumUpgradedTemplateData } from '@/lib/email/email-template-data';
import { shouldSendEmailNow } from '@/lib/email/rollout';
import { hasPremiumAccess } from '@/lib/billing/has-premium-access';
import { mapStripeStatusToTradeHub } from '@/lib/stripe/sync-premium';

type CheckoutSession = Stripe.Checkout.Session;
type StripeSubscription = Stripe.Subscription;
type StripeInvoice = Stripe.Invoice;
type StripeEvent = Stripe.Event;
type StripeSubscriptionWithPeriod = StripeSubscription & {
  current_period_end?: number;
  items?: {
    data?: Array<{
      current_period_end?: number;
    }>;
  };
};

const premiumPriceId = getPremiumPriceId();

type UserLookupResult = {
  id: string;
  email: string | null;
  name: string | null;
  plan: string | null;
  subscription_status: string | null;
  complimentary_premium_until: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function getInvoiceSubscriptionId(invoice: StripeInvoice): string | null {
  const sub = (invoice as { subscription?: string | { id?: string } }).subscription;
  if (typeof sub === 'string') return sub;
  if (sub && typeof sub === 'object' && typeof sub.id === 'string') return sub.id;
  return null;
}

async function findUserForEvent(
  supabase: ReturnType<typeof createServiceSupabase>,
  metadataUserId: string | null,
  customerId: string | null
): Promise<UserLookupResult | null> {
  if (metadataUserId) {
    const { data } = await (supabase as any)
      .from('users')
      .select(
        'id, email, name, plan, subscription_status, complimentary_premium_until, stripe_customer_id, stripe_subscription_id'
      )
      .eq('id', metadataUserId)
      .maybeSingle();
    if (data?.id) return data as UserLookupResult;
  }

  if (!metadataUserId && customerId) {
    const { data } = await (supabase as any)
      .from('users')
      .select(
        'id, email, name, plan, subscription_status, complimentary_premium_until, stripe_customer_id, stripe_subscription_id'
      )
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data?.id) return data as UserLookupResult;
  }

  return null;
}

async function maybeQueuePremiumUpgradedEmail(user: UserLookupResult, stripeEventId: string) {
  // Source of truth is billing state in users table; email is only a side effect.
  if (hasPremiumAccess(user)) return;
  if (!user.email) return;

  const result = await createEmailEvent({
    userId: user.id,
    toEmail: user.email,
    emailType: 'premium_upgraded',
    payload: {
      ...buildPremiumUpgradedTemplateData({ name: user.name }),
      stripeEventId,
    },
    idempotencyKey: `stripe:${stripeEventId}:premium_upgraded`,
    triggerSendImmediately: shouldSendEmailNow({
      emailType: 'premium_upgraded',
      toEmail: user.email,
    }),
  });

  if (!result.ok) {
    console.error('[stripe/webhook] failed to queue premium_upgraded email', {
      userId: user.id,
      eventId: stripeEventId,
      error: result.error,
    });
  }
}

function formatAmountLabel(amountCents: number | null | undefined, currency: string | null | undefined): string {
  const cents = typeof amountCents === 'number' ? amountCents : 0;
  const ccy = (currency || 'aud').toUpperCase();
  return `$${(cents / 100).toFixed(2)} ${ccy}`;
}

function formatDateLabel(tsSeconds?: number | null): string {
  const date = tsSeconds ? new Date(tsSeconds * 1000) : new Date();
  return date.toLocaleDateString('en-AU', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function maybeQueuePaymentReceiptEmail(params: {
  user: UserLookupResult;
  invoice: StripeInvoice;
  stripeEventId: string;
}) {
  if (!params.user.email) return;

  const result = await createEmailEvent({
    userId: params.user.id,
    toEmail: params.user.email,
    emailType: 'payment_receipt',
    payload: {
      firstName: params.user.name?.split(/\s+/)[0] || undefined,
      amountLabel: formatAmountLabel(
        (params.invoice as any).amount_paid ?? params.invoice.amount_due ?? null,
        params.invoice.currency ?? 'aud'
      ),
      dateLabel: formatDateLabel(params.invoice.status_transitions?.paid_at ?? null),
      billingUrl: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tradehub.com.au'}/billing`,
      stripeEventId: params.stripeEventId,
    },
    idempotencyKey: `stripe:${params.stripeEventId}:payment_receipt`,
    triggerSendImmediately: shouldSendEmailNow({
      emailType: 'payment_receipt',
      toEmail: params.user.email,
    }),
  });

  if (!result.ok) {
    console.error('[stripe/webhook] failed to queue payment_receipt email', {
      userId: params.user.id,
      eventId: params.stripeEventId,
      error: result.error,
    });
  }
}

async function maybeQueuePaymentFailedEmail(params: {
  user: UserLookupResult;
  stripeEventId: string;
}) {
  if (!params.user.email) return;

  const result = await createEmailEvent({
    userId: params.user.id,
    toEmail: params.user.email,
    emailType: 'payment_failed',
    payload: {
      firstName: params.user.name?.split(/\s+/)[0] || undefined,
      billingUrl: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tradehub.com.au'}/settings/billing`,
      stripeEventId: params.stripeEventId,
    },
    idempotencyKey: `stripe:${params.stripeEventId}:payment_failed`,
    triggerSendImmediately: shouldSendEmailNow({
      emailType: 'payment_failed',
      toEmail: params.user.email,
    }),
  });

  if (!result.ok) {
    console.error('[stripe/webhook] failed to queue payment_failed email', {
      userId: params.user.id,
      eventId: params.stripeEventId,
      error: result.error,
    });
  }
}

async function persistPlan(
  supabase: ReturnType<typeof createServiceSupabase>,
  user: UserLookupResult,
  nextPlan: 'free' | 'premium',
  customerId?: string | null,
  subscription?: StripeSubscription | null
) {
  const startedAt =
    subscription?.created ? new Date(subscription.created * 1000).toISOString() : null;
  const subWithPeriod = subscription as StripeSubscriptionWithPeriod | null;
  const periodEndSeconds =
    subWithPeriod?.current_period_end ?? subWithPeriod?.items?.data?.[0]?.current_period_end ?? null;
  const renewsAt = periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null;
  const canceledAt = subscription?.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : null;

  const tradeHubStatus = subscription
    ? mapStripeStatusToTradeHub(subscription.status)
    : nextPlan === 'premium'
      ? 'ACTIVE'
      : 'CANCELED';

  const updatePayload: Record<string, unknown> =
    nextPlan === 'premium'
      ? {
          plan: 'premium',
          subscription_status: tradeHubStatus,
          subscription_started_at: startedAt,
          subscription_renews_at: renewsAt,
          subscription_canceled_at: null,
        }
      : {
          plan: 'free',
          subscription_status: tradeHubStatus,
          subscription_started_at: null,
          subscription_renews_at: null,
          subscription_canceled_at: canceledAt ?? new Date().toISOString(),
        };
  if (customerId && !user.stripe_customer_id) updatePayload.stripe_customer_id = customerId;
  if (subscription?.id) updatePayload.stripe_subscription_id = subscription.id;

  const { error } = await (supabase as any).from('users').update(updatePayload).eq('id', user.id);
  if (error) {
    console.error('[stripe/webhook] failed to update user subscription fields', {
      userId: user.id,
      nextPlan,
      error,
    });
  }
}

function isPremiumSubscription(sub: StripeSubscription): boolean {
  if (!premiumPriceId) return false;
  return sub.items.data.some((item) => item.price?.id === premiumPriceId);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured', code: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: 'Stripe not configured', code: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] signature verification failed', { message });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createServiceSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as CheckoutSession;
        const sessionSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : ((session.subscription as { id?: string } | null)?.id ?? null);
        const subscription = sessionSubscriptionId
          ? await stripe.subscriptions.retrieve(sessionSubscriptionId)
          : null;
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : ((session.customer as { id?: string } | null)?.id ?? null);
        const metadataUserId =
          (subscription?.metadata?.userId as string | undefined) ||
          (subscription?.metadata?.user_id as string | undefined) ||
          (session.metadata?.userId as string | undefined) ||
          (session.metadata?.user_id as string | undefined) ||
          null;
        const user = await findUserForEvent(supabase, metadataUserId, customerId);
        if (!user) {
          console.warn('[stripe/webhook] unresolved user mapping', {
            eventType: event.type,
            sessionId: session.id,
            metadataUserId,
            customerId,
          });
          break;
        }
        await persistPlan(supabase, user, 'premium', customerId, subscription);
        await maybeQueuePremiumUpgradedEmail(user, event.id);
        break;
      }
      case 'invoice.payment_succeeded': {
        if (!premiumPriceId) break;
        const invoice = event.data.object as StripeInvoice;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : ((invoice.customer as { id?: string } | null)?.id ?? null);
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!isPremiumSubscription(subscription)) break;

        const metadataUserId =
          (subscription.metadata?.userId as string | undefined) ||
          (subscription.metadata?.user_id as string | undefined) ||
          null;
        const user = await findUserForEvent(supabase, metadataUserId, customerId);
        if (!user) {
          console.warn('[stripe/webhook] unresolved user mapping', {
            eventType: event.type,
            invoiceId: invoice.id,
            metadataUserId,
            customerId,
          });
          break;
        }
        await persistPlan(supabase, user, 'premium', customerId, subscription);
        await maybeQueuePremiumUpgradedEmail(user, event.id);
        await maybeQueuePaymentReceiptEmail({
          user,
          invoice,
          stripeEventId: event.id,
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoice;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : ((invoice.customer as { id?: string } | null)?.id ?? null);
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!isPremiumSubscription(subscription)) break;

        const metadataUserId =
          (subscription.metadata?.userId as string | undefined) ||
          (subscription.metadata?.user_id as string | undefined) ||
          null;
        const user = await findUserForEvent(supabase, metadataUserId, customerId);
        if (!user) {
          console.warn('[stripe/webhook] unresolved user mapping', {
            eventType: event.type,
            invoiceId: invoice.id,
            metadataUserId,
            customerId,
          });
          break;
        }

        await maybeQueuePaymentFailedEmail({
          user,
          stripeEventId: event.id,
        });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as StripeSubscription;
        const customerId =
          typeof sub.customer === 'string'
            ? sub.customer
            : ((sub.customer as { id?: string } | null)?.id ?? null);
        const metadataUserId =
          (sub.metadata?.userId as string | undefined) ||
          (sub.metadata?.user_id as string | undefined) ||
          null;
        const user = await findUserForEvent(supabase, metadataUserId, customerId);
        if (!user) {
          console.warn('[stripe/webhook] unresolved user mapping', {
            eventType: event.type,
            subscriptionId: sub.id,
            metadataUserId,
            customerId,
          });
          break;
        }

        const status = (sub.status || '').toLowerCase();
        const isActiveLike =
          status === 'active' ||
          status === 'trialing' ||
          status === 'past_due' ||
          status === 'unpaid';
        await persistPlan(supabase, user, isActiveLike ? 'premium' : 'free', customerId, sub);
        if (isActiveLike) {
          await maybeQueuePremiumUpgradedEmail(user, event.id);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        const customerId =
          typeof sub.customer === 'string'
            ? sub.customer
            : ((sub.customer as { id?: string } | null)?.id ?? null);
        const metadataUserId =
          (sub.metadata?.userId as string | undefined) ||
          (sub.metadata?.user_id as string | undefined) ||
          null;
        const user = await findUserForEvent(supabase, metadataUserId, customerId);
        if (!user) {
          console.warn('[stripe/webhook] unresolved user mapping', {
            eventType: event.type,
            subscriptionId: sub.id,
            metadataUserId,
            customerId,
          });
          break;
        }
        await persistPlan(supabase, user, 'free', customerId, sub);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
