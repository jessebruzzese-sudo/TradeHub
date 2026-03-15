import Stripe from 'stripe';
import { getStripe as getStripeNullable } from '@/lib/stripe';

export function getStripe(): Stripe {
  const stripe = getStripeNullable();
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not set; billing is not configured.');
  }
  return stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}
