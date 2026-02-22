'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, CalendarCheck, ChevronDown, MapPin, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function HowItWorksHero() {
  const [heroOpen, setHeroOpen] = useState(false);

  const featureCards = (
    <>
      <Card className="border-sky-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border bg-white p-2">
              <MapPin className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="font-medium">Local relevance</p>
              <p className="text-sm text-slate-600">
                Get found by nearby businesses looking for your trade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-sky-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border bg-white p-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">Fill schedule gaps</p>
              <p className="text-sm text-slate-600">
                List available days/weeks and get contacted for real work.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-sky-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border bg-white p-2">
              <Wrench className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">Built for trades</p>
              <p className="text-sm text-slate-600">
                Profiles, messaging, verification signals — all designed for trade businesses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <>
      {/* Mobile: Minimal hero with collapsible */}
      <div className="md:hidden">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-8">
          <div className="rounded-2xl border bg-gradient-to-b from-sky-50 to-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">
              Operate like your own agency — and find more work without lead fees
            </h1>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/signup">
                  Create a free account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/tendering">See how tendering works</Link>
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setHeroOpen((v) => !v)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              aria-expanded={heroOpen}
            >
              <span>{heroOpen ? 'Hide details' : 'What is TradeHub?'}</span>
              <ChevronDown
                className={cn('h-5 w-5 text-slate-500 transition-transform duration-300', heroOpen && 'rotate-180')}
              />
            </button>
            <div
              className={cn(
                'overflow-hidden transition-[max-height,opacity] duration-300 will-change-[max-height,opacity]',
                heroOpen ? 'max-h-[1100px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="space-y-6 pt-6">
                <div className="text-center">
                  <img
                    src="/tradehub-horizontal-main-tagline.svg"
                    alt="TradeHub"
                    className="mx-auto h-12 object-contain"
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    Connecting Aussie trades. No lead fees. Get booked locally.
                  </p>
                </div>
                <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  <Briefcase className="h-4 w-4 text-sky-600" />
                  Built for real trade businesses
                </p>
                <p className="max-w-2xl text-base text-slate-600">
                  TradeHub helps Plumbing, Electrical, Carpentry and other trade businesses stay busy.
                  List availability, get discovered locally, and turn conversations into real jobs.
                </p>
                <div className="flex flex-col gap-3">
                  {featureCards}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Unchanged layout */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-2 text-center md:pt-8 md:pb-3">
          <img
            src="/tradehub-horizontal-main-tagline.svg"
            alt="TradeHub"
            className="mx-auto h-12 md:h-20 lg:h-24 object-contain"
          />
          <p className="mt-1 text-gray-600 text-sm md:text-base">
            Connecting Aussie trades. No lead fees. Get booked locally.
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-4 mt-4 md:mt-6 pb-8">
          <section>
            <div className="rounded-2xl border bg-gradient-to-b from-sky-50 to-white p-8 shadow-sm">
              <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                <Briefcase className="h-4 w-4 text-sky-600" />
                Built for real trade businesses
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Operate like your own agency — and find more work without lead fees
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600">
                TradeHub helps Plumbing, Electrical, Carpentry and other trade businesses stay busy.
                List availability, get discovered locally, and turn conversations into real jobs.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/signup">
                    Create a free account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/tendering">See how tendering works</Link>
                </Button>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {featureCards}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
