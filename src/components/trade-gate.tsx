// vim: ts=2
'use client';

import UserContext from "@/lib/user-context";
import { useEffect, useState, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isUserAdmin } from '@/lib/is-admin';

export function TradeGate({ children, currentUser }: { children: React.ReactNode, currentUser: any }) {

	const isAdmin = isUserAdmin(currentUser);
  const router = useRouter();
  const pathname = usePathname();
  const [hasChecked, setHasChecked] = useState(false);
  const hasPrimaryTrade = ( currentUser?.business?.primaryTrade ?? null ) !== null;

  useEffect(() => {
		if(hasChecked){
			return;
		}
    if (currentUser && !isAdmin && !hasPrimaryTrade && pathname !== '/onboarding/trade') {
      setHasChecked(true);
      router.push('/onboarding/trade');
    } else if (currentUser && hasPrimaryTrade) {
      setHasChecked(true);
    }
  }, [hasChecked]);
	
  if (!currentUser) {
    return null;
  }

  if (!hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
