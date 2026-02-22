'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  CircleDollarSign,
  UserCircle,
  MapPin,
} from 'lucide-react';
import { safeRouterPush } from '@/lib/safe-nav';

export function HeroCard() {
  const { session, currentUser } = useAuth();
  const router = useRouter();
  const isAuthed = !!session?.user;

  const handleJoinFree = () => {
    if (isAuthed) {
      safeRouterPush(router, '/dashboard', '/dashboard');
      return;
    }
    safeRouterPush(router, '/signup', '/signup');
  };

  const tradesNearYouHref = isAuthed ? '/discover/plumber' : '/login?returnUrl=%2Fdiscover%2Fplumber';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div
        className="relative overflow-hidden rounded-2xl bg-blue-600 p-6 text-white md:p-10"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      >
        <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium">
          Built for Aussie tradies
        </span>

        <h1 className="mt-4 text-2xl font-extrabold leading-tight md:text-4xl md:leading-tight">
          Stop chasing work. Get booked locally.
        </h1>

        <p className="mt-3 text-sm text-blue-100 md:text-base">
          Plumbing, Electrical, Carpentry, Concreting, Tiling, Painting, Plastering, Roofing and more.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
            <CircleDollarSign className="h-4 w-4" />
            No lead fees
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
            <UserCircle className="h-4 w-4" />
            Public profiles + reviews
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
            <MapPin className="h-4 w-4" />
            15km free • 50km Premium
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="w-full rounded-xl bg-white px-6 py-6 text-base font-semibold text-blue-600 hover:bg-blue-50 sm:w-auto"
            onClick={handleJoinFree}
          >
            Join free
          </Button>
          <Link href={tradesNearYouHref} className="block">
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-xl border-white/40 bg-transparent px-6 py-6 text-base font-medium text-white hover:bg-white/15 sm:w-auto"
            >
              See trades near you
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
