/**
 * Stripe → TradeHub premium sync logic.
 * Maps Stripe subscription state to unified premium fields.
 * Server-only. Do NOT touch subcontractor_plan enum.
 */

import type Stripe from 'stripe';

export type TradeHubSubscriptionStatus = 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

/** Map Stripe subscription status to TradeHub subscription_status. */
export function mapStripeStatusToTradeHub(status: string): TradeHubSubscriptionStatus {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'trialing') return 'ACTIVE';
  if (s === 'past_due' || s === 'unpaid') return 'PAST_DUE';
  if (s === 'canceled' || s === 'incomplete_expired') return 'CANCELED';
  return 'NONE';
}

export type PremiumSyncPayload = {
  is_premium: boolean;
  active_plan: string;
  subscription_status: TradeHubSubscriptionStatus;
  subscription_started_at: string | null;
  subscription_renews_at: string | null;
  subscription_canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type SubWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
  items?: {
    data?: Array<{
      current_period_end?: number;
    }>;
  };
};

/**
 * Build the payload to update public.users for an active premium subscription.
 */
export function buildActivePremiumPayload(
  customerId: string,
  subscriptionId: string,
  sub: Stripe.Subscription
): PremiumSyncPayload {
  const subWithPeriod = sub as SubWithPeriod;
  const periodEndSeconds = subWithPeriod.current_period_end ?? subWithPeriod.items?.data?.[0]?.current_period_end;
  const renewsAt = periodEndSeconds
    ? new Date(periodEndSeconds * 1000).toISOString()
    : null;
  const startedAt = sub.created ? new Date(sub.created * 1000).toISOString() : null;
  const status = mapStripeStatusToTradeHub(sub.status);

  return {
    is_premium: status === 'ACTIVE',
    active_plan: 'ALL_ACCESS_PRO_26',
    subscription_status: status,
    subscription_started_at: startedAt,
    subscription_renews_at: renewsAt,
    subscription_canceled_at: null,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  };
}

/**
 * Build the payload for a canceled/ended subscription.
 * Keeps stripe_customer_id and stripe_subscription_id for history.
 */
export function buildCanceledPayload(
  customerId: string,
  sub: Stripe.Subscription | null
): PremiumSyncPayload {
  const canceledAt = sub?.canceled_at
    ? new Date(sub.canceled_at * 1000).toISOString()
    : new Date().toISOString();

  return {
    is_premium: false,
    active_plan: 'NONE',
    subscription_status: 'CANCELED',
    subscription_started_at: null,
    subscription_renews_at: null,
    subscription_canceled_at: canceledAt,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub?.id ?? null,
  };
}
