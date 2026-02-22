'use client';

import Link from 'next/link';
import { ArrowRight, UserPlus, Search, Briefcase } from 'lucide-react';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Create your profile',
    desc: 'Add your trade, service area, and availability. Choose public or private visibility.',
    href: '/how-it-works',
    cardBg: 'bg-blue-50/60',
    borderColor: 'border-blue-100',
    hoverRing: 'hover:ring-2 hover:ring-blue-200/60',
    pillBg: 'bg-blue-100',
    pillText: 'text-blue-700',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
  },
  {
    icon: Search,
    title: 'Get discovered',
    desc: 'Trades near you puts your profile in front of clients searching in your radius.',
    href: '/how-it-works/subcontractors',
    cardBg: 'bg-emerald-50/60',
    borderColor: 'border-emerald-100',
    hoverRing: 'hover:ring-2 hover:ring-emerald-200/60',
    pillBg: 'bg-emerald-100',
    pillText: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
  },
  {
    icon: Briefcase,
    title: 'Win work',
    desc: 'Apply to jobs, quote tenders, and message directly. No lead fees ever.',
    href: '/how-tendering-works',
    cardBg: 'bg-amber-50/60',
    borderColor: 'border-amber-100',
    hoverRing: 'hover:ring-2 hover:ring-amber-200/60',
    pillBg: 'bg-amber-100',
    pillText: 'text-amber-700',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
  },
];

export function HowItWorksBand() {
  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900 md:text-3xl">
              How it works
            </h2>
            <img
              src="/favicon.png"
              alt="TradeHub"
              className="h-8 w-8 object-contain md:h-10 md:w-10"
            />
          </div>
          <p className="mt-1.5 text-sm text-slate-600 md:text-base">
            Three steps to more booked days.
          </p>
        </div>

        <div className="mt-6 space-y-3 md:hidden">
          {STEPS.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
            >
              <span className="text-base font-semibold text-gray-900">{step.title}</span>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </Link>
          ))}
        </div>

        <div className="hidden gap-6 md:grid md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                <div
                  className={`flex flex-col rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${step.cardBg} ${step.borderColor} ${step.hoverRing}`}
                >
                  <span
                    className={`mb-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.pillBg} ${step.pillText}`}
                  >
                    {i + 1}
                  </span>
                  <div
                    className={`mb-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${step.iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${step.iconText}`} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{step.desc}</p>
                  <span className={`mt-4 inline-flex items-center text-sm font-medium ${step.pillText} group-hover:underline`}>
                    Learn more
                    <span className="ml-1">→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
