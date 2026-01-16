/**
 * Billing Simulation Utilities
 *
 * Pure utilities for testing Premium features without real billing.
 * NO REACT IMPORTS - safe for server components.
 *
 * IMPORTANT: This is for development/testing only, not production billing.
 */

const STORAGE_KEY = 'tradehub:v1:sim_premium';

/**
 * Single source of truth: is simulation allowed?
 * HARD BLOCK: Simulation is NEVER allowed in production builds
 */
export const BILLING_SIM_ALLOWED =
  typeof window !== 'undefined' &&
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_BILLING_SIMULATION === 'true';

/**
 * Get the current simulated premium status from localStorage
 */
export function getSimulatedPremium(): boolean {
  if (!BILLING_SIM_ALLOWED) return false;

  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set the simulated premium status in localStorage
 */
export function setSimulatedPremium(enabled: boolean): void {
  if (!BILLING_SIM_ALLOWED) return;

  try {
    enabled
      ? localStorage.setItem(STORAGE_KEY, 'true')
      : localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to set simulated premium:', e);
  }
}

/**
 * Clear simulated premium state (useful for resetting)
 */
export function clearSimulatedPremium(): void {
  if (!BILLING_SIM_ALLOWED) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear simulated premium:', e);
  }
}

/**
 * Legacy: Check if billing simulation is enabled
 * @deprecated Use BILLING_SIM_ALLOWED constant instead
 */
export function isBillingSimEnabled(): boolean {
  return BILLING_SIM_ALLOWED;
}
