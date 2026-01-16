/**
 * React Hook for Simulated Premium State
 *
 * Manages simulated premium status with cross-tab sync via storage events.
 * Client-side only - this file imports React hooks.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSimulatedPremium,
  setSimulatedPremium,
  BILLING_SIM_ALLOWED,
} from './billing-sim';

/**
 * Hook to manage simulated premium state with cross-tab synchronization
 *
 * @returns [isSimulated, setSimulated] - Current state and setter function
 *
 * Features:
 * - Syncs across browser tabs via storage events
 * - Respects BILLING_SIM_ALLOWED gate
 * - Returns [false, noop] if simulation is disabled
 */
export function useSimulatedPremium(): [boolean, (enabled: boolean) => void] {
  const [isSimulated, setIsSimulated] = useState(getSimulatedPremium);

  useEffect(() => {
    if (!BILLING_SIM_ALLOWED) return;

    const handler = () => setIsSimulated(getSimulatedPremium());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setSimulated = useCallback((enabled: boolean) => {
    setSimulatedPremium(enabled);
    setIsSimulated(enabled);
  }, []);

  return [isSimulated, setSimulated];
}
