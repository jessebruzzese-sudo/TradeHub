'use client';

import Link from 'next/link';
import { UserX } from 'lucide-react';
import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';

export function PublicProfileNotFound() {
  return (
    <AppLayout>
      <div
        data-testid="profile-not-found"
        className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <UserX className="mx-auto mb-4 h-14 w-14 text-slate-400" />
            <h1 className="text-xl font-semibold text-slate-900">Profile not found</h1>
            <p className="mt-2 text-sm text-slate-600">
              This profile may be private, removed, or the link may be incorrect.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard">
                <Button variant="default">Back to dashboard</Button>
              </Link>
              <Link href="/subcontractors">
                <Button variant="outline">Browse subcontractors</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
