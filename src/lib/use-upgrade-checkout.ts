'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';

export type BillingPlanKey = 'BUSINESS_PRO_20' | 'SUBCONTRACTOR_PRO_10' | 'ALL_ACCESS_PRO_26';

export function useUpgradeCheckout(plan: BillingPlanKey = 'BUSINESS_PRO_20') {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (placement: string) => {
    trackEvent('upgrade_cta_clicked', { placement });
    if (!currentUser) {
      window.location.href = '/signup';
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Could not start checkout');
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      alert('Could not start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return { handleUpgrade, isLoading };
}
