'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';

export function TradeGate({ children }: { children: React.ReactNode }) {
  const { currentUser: user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasChecked, setHasChecked] = useState(false);
  const hasPrimaryTrade =
    !!(
      user?.primaryTrade ||
      (user as any)?.primary_trade ||
      (Array.isArray((user as any)?.trades) ? (user as any).trades[0] : null) ||
      (Array.isArray((user as any)?.trade_categories) ? (user as any).trade_categories[0] : null)
    );

  useEffect(() => {
    if (isLoading || hasChecked) return;

    if (user && !isAdmin(user) && !hasPrimaryTrade && pathname !== '/onboarding/trade') {
      setHasChecked(true);
      router.push('/onboarding/trade');
    } else if (user) {
      setHasChecked(true);
    }
  }, [user, isLoading, router, pathname, hasChecked, hasPrimaryTrade]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin(user) && !hasPrimaryTrade && pathname !== '/onboarding/trade') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
