'use client';

import { UserPlus, Search, Briefcase } from 'lucide-react';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Create your profile',
    desc: 'Add your trade, service area, and availability. Choose public or private visibility.',
  },
  {
    icon: Search,
    title: 'Get discovered',
    desc: 'Trades near you puts your profile in front of clients searching in your radius.',
  },
  {
    icon: Briefcase,
    title: 'Win work',
    desc: 'Apply to jobs, quote tenders, and message directly. No lead fees ever.',
  },
];

export function HowItWorksBand() {
  return (
    <section className="py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Three steps to more booked days.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex flex-col rounded-xl border border-gray-100 bg-slate-50/50 p-6"
                >
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    {i + 1}
                  </span>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
