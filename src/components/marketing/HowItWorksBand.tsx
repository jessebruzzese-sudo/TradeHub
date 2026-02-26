'use client';

import Image from 'next/image';
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
    <section id="how-it-works" className="py-8 md:py-10 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 md:gap-5">
            <Image
              src="/tradehub-mark.svg"
              alt="TradeHub"
              width={40}
              height={40}
              className="h-8 w-8 md:h-12 md:w-12"
            />
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              How it works
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-slate-600 md:text-base">
            Three steps to more booked days.
          </p>
        </div>

        <div className="mt-6 space-y-3 md:hidden">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${step.iconBg} ${step.iconText}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-semibold text-slate-900">{step.title}</span>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>

        <div className="hidden gap-5 md:grid md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const ringColor = step.borderColor.replace('border-', 'ring-');
            return (
              <Link
                key={step.title}
                href={step.href}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                <div
                  className={`flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-md ${step.cardBg} ${step.borderColor} ${step.hoverRing}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {i + 1}
                    </span>
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${step.iconBg} ring-1 ${ringColor}`}>
                      <Icon className={`h-5 w-5 ${step.iconText}`} />
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{step.desc}</p>
                    <span className={`inline-flex items-center gap-2 text-base font-semibold ${step.pillText} group-hover:underline`}>
                      Learn more
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
