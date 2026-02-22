'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { safeRouterPush } from '@/lib/safe-nav';

export function FinalCTA() {
  const { session } = useAuth();
  const router = useRouter();
  const isAuthed = !!session?.user;

  const handleJoinFree = () => {
    if (isAuthed) {
      safeRouterPush(router, '/dashboard', '/dashboard');
      return;
    }
    safeRouterPush(router, '/signup', '/signup');
  };

  return (
    <section className="py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-semibold text-gray-900 md:text-2xl">
              Ready to get booked?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              15km free radius. No credit card. Australia-wide.
            </p>
            <Button
              size="lg"
              onClick={handleJoinFree}
              className="mt-6 w-full rounded-xl px-8 py-6 text-base font-semibold sm:w-auto"
            >
              Join free
            </Button>
            <p className="mt-4 text-xs text-slate-500">15km free radius • Upgrade anytime</p>
          </div>
        </div>
      </div>
    </section>
  );
}
