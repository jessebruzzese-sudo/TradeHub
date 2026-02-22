'use client';

import Link from 'next/link';
import { EyeOff } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { Button } from '@/components/ui/button';

export function PrivateProfileNotice() {
  const { currentUser } = useAuth();

  if (!currentUser || isAdmin(currentUser)) return null;

  const isDiscoverable =
    currentUser.isPublicProfile === true ||
    (currentUser as { is_public_profile?: boolean })?.is_public_profile === true;

  if (isDiscoverable) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <EyeOff className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Your profile is private</p>
            <p className="mt-0.5 text-sm text-amber-800">
              You won&apos;t appear in &quot;Trades near you&quot; lists. Turn on Public profile to get discovered.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          <Button asChild size="sm" className="bg-amber-700 hover:bg-amber-800">
            <Link href="/profile/edit#public-profile">Enable public profile</Link>
          </Button>
          <Link
            href="/trust-safety"
            className="text-sm font-medium text-amber-800 underline decoration-amber-600 underline-offset-2 hover:text-amber-900"
          >
            Learn more
          </Link>
        </div>
      </div>
    </div>
  );
}
