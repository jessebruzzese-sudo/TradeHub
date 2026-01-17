'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterReplace } from '@/lib/safe-nav';

export default function DashboardPage() {
  const { session, currentUser, isLoading } = useAuth();
  const router = useRouter();

  const hasSession = !!session?.user;

  // If we know we're logged out, go to login (only after auth finishes initializing)
  useEffect(() => {
    if (!isLoading && !hasSession) {
      safeRouterReplace(router, buildLoginUrl('/dashboard'), '/login');
    }
  }, [isLoading, hasSession, router]);

  // While auth is determining session, show a small loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Loading...
      </div>
    );
  }

  // If no session, we already kicked to login
  if (!hasSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Redirecting…
      </div>
    );
  }

  // Session exists — do NOT block the whole dashboard on currentUser.
  // Show a soft "profile still loading" state instead of infinite spinner.
  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Loading your profile…
      </div>
    );
  }

  // ✅ Render dashboard once currentUser exists
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Logged in as <span className="font-medium">{(currentUser as any)?.name ?? session.user.email}</span>
      </p>

      {/* Put your existing dashboard UI below this */}
    </div>
  );
}

