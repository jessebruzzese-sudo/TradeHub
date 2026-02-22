'use client';

import { CircleDollarSign, UserCircle, MapPin } from 'lucide-react';

const TILES = [
  {
    icon: CircleDollarSign,
    title: 'No lead fees',
    desc: 'You never pay for leads. Work comes from real jobs, tenders, and discovery — not bought lists.',
  },
  {
    icon: UserCircle,
    title: 'Public profiles',
    desc: 'Build a visible profile with reviews so clients find and trust you locally.',
  },
  {
    icon: MapPin,
    title: 'Radius-based',
    desc: '15km free radius. Premium unlocks 50km. Work where you are, not where leads are sold.',
  },
];

export function WhyTiles() {
  return (
    <section className="py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
            Why tradies choose TradeHub
          </h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Less chasing. More booked days.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.title}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{tile.title}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">{tile.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
