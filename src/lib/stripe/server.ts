/**
 * Stripe server-side instance. Use only in API routes or server code.
 * Requires STRIPE_SECRET_KEY.
 */
import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not set; billing routes will fail.');
}

let stripeInstance: Stripe | null = null;

/**
 * Returns the Stripe instance. Throws if STRIPE_SECRET_KEY is not set.
 * Instance is created once when first called (lazy singleton).
 */
export function getStripe(): Stripe {
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set; billing is not configured.');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' as const, typescript: true });
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
