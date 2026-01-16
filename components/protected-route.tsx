'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { getSafeReturnUrl, safeRouterPush } from '@/lib/safe-nav';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: ('admin' | 'contractor' | 'subcontractor')[];
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !currentUser) {
      const loginPath = fallbackPath === '/login'
        ? `/login?returnUrl=${encodeURIComponent(pathname)}`
        : fallbackPath;
      console.log('[ProtectedRoute] Redirecting unauthenticated user to:', loginPath);
      safeRouterPush(router, loginPath, '/login');
      return;
    }

    if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
      console.log('[ProtectedRoute] User role not allowed, redirecting to dashboard');
      safeRouterPush(router, '/dashboard', '/dashboard');
      return;
    }
  }, [currentUser, isLoading, requireAuth, allowedRoles, router, pathname, fallbackPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    return null;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return null;
  }

  return <>{children}</>;
}
