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

  useEffect(() => {
    if (isLoading || hasChecked) return;

    if (user && !isAdmin(user) && !user.primaryTrade && pathname !== '/onboarding/trade') {
      setHasChecked(true);
      router.push('/onboarding/trade');
    } else if (user) {
      setHasChecked(true);
    }
  }, [user, isLoading, router, pathname, hasChecked]);

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

  if (!isAdmin(user) && !user.primaryTrade && pathname !== '/onboarding/trade') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
