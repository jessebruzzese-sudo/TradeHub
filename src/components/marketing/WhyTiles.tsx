'use client';

import { ArrowRight, CircleDollarSign, UserCircle, MapPin } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const TILES = [
  {
    value: 'fees',
    icon: CircleDollarSign,
    title: 'No lead fees',
    desc: 'You never pay for leads. Work comes from real jobs, tenders, and discovery — not bought lists.',
    expanded:
      "Unlike lead marketplaces, TradeHub doesn't sell your details to multiple contractors. You get contacted for real jobs, tenders, and discovery — and keep more of what you earn.",
    accentStrip: <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-sky-400" />,
    iconClasses: 'mt-0.5 h-11 w-11 rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 flex items-center justify-center',
    itemClasses: 'data-[state=open]:border-l-blue-500',
    bestFor: 'subcontractors',
    tip: 'Tip: Keep more profit by avoiding lead fees.',
  },
  {
    value: 'profiles',
    icon: UserCircle,
    title: 'Public profiles',
    desc: 'Build a visible profile with reviews so clients find and trust you locally.',
    expanded:
      'Build trust with a profile that shows your trade, service area, availability, and reviews. Contractors can verify you quickly and message you directly without chasing.',
    accentStrip: <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />,
    iconClasses: 'mt-0.5 h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 flex items-center justify-center',
    itemClasses: 'data-[state=open]:border-l-emerald-500',
    bestFor: 'builders',
    tip: 'Tip: Reviews + availability increase replies.',
  },
  {
    value: 'radius',
    icon: MapPin,
    title: 'Radius-based',
    desc: '15km free radius. Premium unlocks 50km. Work where you are, not where leads are sold.',
    expanded:
      'Matches are based on where you actually work. Free accounts appear within 15km, and Premium expands your reach — so you stay relevant and avoid wasted travel.',
    accentStrip: <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-400" />,
    iconClasses: 'mt-0.5 h-11 w-11 rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 flex items-center justify-center',
    itemClasses: 'data-[state=open]:border-l-amber-500',
    bestFor: 'local work',
    tip: 'Tip: Set your service area to stay relevant.',
  },
];

export function WhyTiles() {
  return (
    <section className="py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Why tradies choose TradeHub
            </h2>
            <img
              src="/favicon.png"
              alt="TradeHub"
              className="h-8 w-8 md:h-10 md:w-10 object-contain"
            />
          </div>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Less chasing. More booked days.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <AccordionItem
                key={tile.value}
                value={tile.value}
                className={`group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:bg-slate-50 data-[state=open]:border-l-4 ${tile.itemClasses}`}
              >
                {tile.accentStrip}
                <AccordionTrigger className="group px-6 py-5 hover:no-underline [&>svg]:hidden">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={tile.iconClasses}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {tile.title}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-0">
                  <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
                    {tile.expanded}
                    <div className="mt-2 text-xs text-gray-500">{tile.tip}</div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
}
