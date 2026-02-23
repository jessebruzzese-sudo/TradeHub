'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  CircleDollarSign,
  UserCircle,
  MapPin,
} from 'lucide-react';
import { safeRouterPush } from '@/lib/safe-nav';
import { cn } from '@/lib/utils';

const PROOF_ITEMS = [
  'No credit card',
  '2 min setup',
  'Australia-wide',
  'No lead fees',
  'Never be over or under staffed',
];

type HeroCardProps = {
  mobileMinimal?: boolean;
  heroOpen?: boolean;
  onHeroToggle?: () => void;
  detailsPrefix?: React.ReactNode;
};

export function HeroCard({ mobileMinimal, heroOpen: _heroOpen, onHeroToggle: _onHeroToggle, detailsPrefix }: HeroCardProps) {
  const [showDetails, setShowDetails] = useState(false);
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

  const handleTendering = () => safeRouterPush(router, '/tendering', '/tendering');
  const tradesNearYouHref = isAuthed ? '/discover/plumber' : '/login?returnUrl=%2Fdiscover%2Fplumber';
  const handleTradesNearYou = () => safeRouterPush(router, tradesNearYouHref, tradesNearYouHref);

  const headline = (
    <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
      <span className="block">Contract yourself or your staff.</span>
      <span className="mt-2 block">
        Be your own agency — <span className="text-blue-100">fill in your schedule.</span>
      </span>
    </h1>
  );

  const primaryCta = (
    <Button
      size="lg"
      className="w-full rounded-xl bg-white px-6 py-6 text-base font-semibold text-blue-600 hover:bg-blue-50 sm:w-auto"
      onClick={handleJoinFree}
    >
      Join free
    </Button>
  );

  const minimalPrimaryCta = (
    <Button
      size="lg"
      className="w-full rounded-xl bg-white px-6 py-6 text-base font-semibold text-blue-600 hover:bg-blue-50"
      onClick={handleJoinFree}
    >
      Create a free account
    </Button>
  );

  const minimalSecondaryCta = (
    <Button
      variant="outline"
      size="lg"
      onClick={handleTendering}
      className="w-full rounded-xl border-white/40 bg-transparent px-6 py-6 text-base font-medium text-white hover:bg-white/15"
    >
      See how tendering works
    </Button>
  );

  const detailsContent = (
    <>
      {detailsPrefix}
      <span className="mb-6 inline-block rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-white backdrop-blur">
        Built for Aussie tradies
      </span>
      <p className="max-w-2xl text-lg text-blue-100">
        Get booked locally through real jobs, tenders, and discovery — no lead fees.
      </p>
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
          <CircleDollarSign className="h-4 w-4 text-emerald-300" />
          No lead fees
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
          <UserCircle className="h-4 w-4 text-sky-200" />
          Public profiles + reviews
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
          <MapPin className="h-4 w-4 text-amber-200" />
          20km free • 100km Premium
        </span>
      </div>
      <Button
        variant="outline"
        size="lg"
        onClick={handleTradesNearYou}
        className="w-full rounded-xl border-white/40 bg-transparent px-6 py-6 text-base font-medium text-white hover:bg-white/15 md:hidden"
      >
        See trades near you
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-blue-100">
        {PROOF_ITEMS.map((label) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-300/70" aria-hidden />
            <span>{label}</span>
          </span>
        ))}
      </div>
    </>
  );

  if (mobileMinimal) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl bg-blue-600 p-6 text-white shadow-sm md:hidden"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        >
          {headline}
          <div className="mt-6 flex flex-col gap-3">
            {minimalPrimaryCta}
            {minimalSecondaryCta}
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 text-white/90 transition hover:text-white"
            aria-expanded={showDetails}
          >
            <span className="text-sm font-semibold">
              {showDetails ? 'Hide details' : 'Show details'}
            </span>
            <span className={cn('h-6 w-6 transition-transform duration-300', showDetails && 'rotate-180')}>⌄</span>
          </button>
          {showDetails && (
            <div className="mt-4 space-y-4">
              {detailsContent}
            </div>
          )}
        </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-blue-600 p-6 text-white shadow-sm md:p-10 hidden md:block"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      >
        <span className="mb-6 inline-block rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-white backdrop-blur">
          Built for Aussie tradies
        </span>
        {headline}
        <div className="mt-6 flex flex-col">
          <div className="space-y-4 md:order-1 md:block">
            <p className="max-w-2xl text-lg text-blue-100">
              Get booked locally through real jobs, tenders, and discovery — no lead fees.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
                <CircleDollarSign className="h-4 w-4 text-emerald-300" />
                No lead fees
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
                <UserCircle className="h-4 w-4 text-sky-200" />
                Public profiles + reviews
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium md:text-sm">
                <MapPin className="h-4 w-4 text-amber-200" />
                20km free • 100km Premium
              </span>
            </div>
          </div>
          <div className="order-1 flex flex-col gap-3 sm:flex-row sm:items-center md:order-2 md:mt-6">
            {primaryCta}
            <Button
              variant="outline"
              size="lg"
              onClick={handleTradesNearYou}
              className="w-full rounded-xl border-white/40 bg-transparent px-6 py-6 text-base font-medium text-white hover:bg-white/15 sm:w-auto"
            >
              See trades near you
            </Button>
          </div>
          <div className="order-3 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-blue-100">
            {PROOF_ITEMS.map((label) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300/70" aria-hidden />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
  );
}
