'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CircleDollarSign,
  UserCircle,
  MapPin,
  Briefcase,
  Plus,
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
  const router = useRouter();

  const headline = (
    <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
      <span className="block">Find <span className="text-blue-600">work.</span></span>
      <span className="mt-2 block">Find <span className="text-blue-600">workers.</span></span>
      <span className="mt-2 block">Connect <span className="text-blue-600">directly.</span></span>
    </h1>
  );

  const primaryCta = (
    <Button
      size="lg"
      className="w-full rounded-xl bg-blue-600 px-6 py-6 text-base font-semibold text-white hover:bg-blue-700 sm:w-auto"
      onClick={() => safeRouterPush(router, '/jobs', '/jobs')}
    >
      <Briefcase className="mr-2 h-5 w-5" />
      View Jobs
    </Button>
  );

  const minimalPrimaryCta = (
    <Button
      size="lg"
      className="w-full rounded-xl bg-blue-600 px-6 py-6 text-base font-semibold text-white hover:bg-blue-700"
      onClick={() => safeRouterPush(router, '/jobs', '/jobs')}
    >
      <Briefcase className="mr-2 h-5 w-5" />
      View Jobs
    </Button>
  );

  const minimalSecondaryCta = (
    <Button
      size="lg"
      className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-6 text-base font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
      onClick={() => safeRouterPush(router, '/jobs/create', '/jobs/create')}
    >
      <Plus className="mr-2 h-5 w-5" />
      Post Job
    </Button>
  );

  const detailsContent = (
    <>
      {detailsPrefix}
      <span className="mb-6 inline-block rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
        Built for Aussie tradies
      </span>
      <p className="mx-auto max-w-2xl text-lg text-slate-600">
        Get booked locally through real jobs and discovery — no lead fees.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 md:text-sm">
          <CircleDollarSign className="h-4 w-4 text-emerald-600" />
          No lead fees
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 md:text-sm">
          <UserCircle className="h-4 w-4 text-sky-600" />
          Public profiles + reviews
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 md:text-sm">
          <MapPin className="h-4 w-4 text-amber-600" />
          20km free • 100km Premium
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
        {PROOF_ITEMS.map((label) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <span>{label}</span>
          </span>
        ))}
      </div>
    </>
  );

  if (mobileMinimal) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl bg-white text-slate-900 border border-slate-200 p-6 shadow-sm md:hidden text-center"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)`,
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 text-slate-600 transition hover:text-slate-900"
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
      className="relative overflow-hidden rounded-2xl bg-white text-slate-900 border border-slate-200 p-6 shadow-sm md:p-10 hidden md:block text-center"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      >
        <span className="mb-6 inline-block rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
          Built for Aussie tradies
        </span>
        {headline}
        <div className="mt-6 flex flex-col">
          <div className="space-y-4 md:order-1 md:block">
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Get booked locally through real jobs and discovery — no lead fees.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 md:text-sm">
                <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                No lead fees
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 md:text-sm">
                <UserCircle className="h-4 w-4 text-sky-600" />
                Public profiles + reviews
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 md:text-sm">
                <MapPin className="h-4 w-4 text-amber-600" />
                20km free • 100km Premium
              </span>
            </div>
          </div>
          <div className="order-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center md:order-2 md:mt-6">
            {primaryCta}
            <Button
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-6 text-base font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-600 sm:w-auto"
              onClick={() => safeRouterPush(router, '/jobs/create', '/jobs/create')}
            >
              <Plus className="mr-2 h-5 w-5" />
              Post Job
            </Button>
          </div>
          <div className="order-3 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
            {PROOF_ITEMS.map((label) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
  );
}
