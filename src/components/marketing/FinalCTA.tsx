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
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-blue-50/40 to-white p-5 shadow-sm transition hover:shadow-md md:p-8">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 to-sky-400" />
          <div className="flex flex-col items-center text-center">
            <img
              src="/tradehub-horizontal-main-tagline.svg"
              alt="TradeHub"
              className="mx-auto mb-3 h-8 object-contain md:h-12"
            />
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 md:text-3xl">
              Ready to get booked?
            </h2>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              20km free radius. No credit card. Australia-wide.
            </p>
            <Button
              size="lg"
              onClick={handleJoinFree}
              className="mt-4 h-11 w-full rounded-xl px-6 font-semibold md:h-12 md:w-auto"
            >
              Join free
            </Button>
            <p className="mt-3 text-xs text-gray-500">20km free radius • Upgrade anytime</p>
          </div>
        </div>
      </div>
    </section>
  );
}
