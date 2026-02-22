/**
 * Stripe helper - safe when env vars are missing.
 * Use in API routes only (server-side).
 */
import Stripe from 'stripe';

export function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !secret.trim()) return null;
  return new Stripe(secret.trim(), {
    apiVersion: '2026-01-28.clover' as const,
    typescript: true,
  });
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://tradehub.com.au'
  ).replace(/\/$/, '');
}
