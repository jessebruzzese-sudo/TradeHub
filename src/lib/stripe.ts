import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;

  if (!stripeInstance) {
    stripeInstance = new Stripe(secret, {
      apiVersion: '2026-02-25.clover' as const,
      typescript: true,
    });
  }

  return stripeInstance;
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/** Backwards-compatible alias used by older routes. */
export function getSiteUrl(): string {
  return getAppUrl();
}

export function getPremiumPriceId(): string | null {
  return (
    process.env.STRIPE_PREMIUM_PRICE_ID?.trim() ||
    process.env.STRIPE_PRICE_PREMIUM?.trim() ||
    null
  );
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}
