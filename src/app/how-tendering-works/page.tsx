'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Upload, Target, BadgeDollarSign, ClipboardCheck, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { useRouter } from 'next/navigation';

const STEPS = [
  {
    icon: Upload,
    title: 'Upload plans',
    description:
      'Upload drawings, scopes, or specifications for your project. Only suburb and postcode are shown to contractors — your exact address stays private until you accept a quote.',
  },
  {
    icon: Target,
    title: 'Select trades & radius',
    description:
      'Choose which trades you need quotes from and set your search radius. Control how many quotes you want to receive and who can see your tender.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Receive quotes',
    description:
      'Verified contractors submit quotes directly through the platform. Compare pricing, review contractor profiles, and communicate before making your decision. No paid leads.',
  },
  {
    icon: ClipboardCheck,
    title: 'Convert to job',
    description:
      "Message contractors, shortlist your favorites, and convert a tender into a confirmed job when you're ready. All communication stays organized within the platform.",
  },
];

export default function HowTenderingWorksPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [openStep, setOpenStep] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-blue-700 text-white">
      {/* Faint radial glow behind hero */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl" />
      </div>

      <div className="sticky top-0 z-50 border-b border-white/10 bg-blue-700/80 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-sm text-blue-100 hover:text-white">
            ← Back
          </Link>

          {currentUser ? (
            <Button size="sm" onClick={() => router.push(isAdmin(currentUser) ? '/admin' : '/dashboard')} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Dashboard
            </Button>
          ) : (
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Create account
            </Link>
          )}
        </div>
      </div>

      <div className="pt-4">
        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-10 pb-16 md:pt-14 md:pb-20">
        {/* Premium hero block */}
        <div className="mb-16 text-center">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="group">
              <div className="relative h-14 w-56 md:h-20 md:w-80 transition-opacity duration-200 group-hover:opacity-80">
                <Image
                  src="/tradehub-white.png"
                  alt="TradeHub"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            How project tendering works
          </h1>
          <p className="mt-6 text-lg text-blue-100 md:text-xl">
            A transparent, controlled process for pricing construction projects — without lead fees.
          </p>
        </div>

        {/* Step cards - mobile accordion */}
        <div className="md:hidden space-y-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={`relative rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                  openStep === index
                    ? 'border-white/50 bg-white/14 shadow-[0_10px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/25'
                    : 'border-white/25 bg-white/8 shadow-[0_6px_22px_rgba(0,0,0,0.18)] hover:border-white/40 hover:bg-white/10'
                }`}
              >
                {openStep === index && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.18), 0 0 40px rgba(255,255,255,0.10)' }}
                    aria-hidden
                  />
                )}
                <button
                  onClick={() =>
                    setOpenStep(openStep === index ? null : index)
                  }
                  className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-blue-200">Step {index + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {step.title}
                    </h3>
                  </div>

                  {/* Right-side large icon + chevron */}
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Accent Icon Box */}
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-xl ring-1 transition-all duration-300 ${
                        openStep === index
                          ? 'ring-white/40 scale-105'
                          : 'ring-white/15'
                      } ${
                        index === 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : index === 1
                          ? 'bg-sky-500/20 text-sky-300'
                          : index === 2
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {index === 0 && <Upload className="h-6 w-6" />}
                      {index === 1 && <Target className="h-6 w-6" />}
                      {index === 2 && <BadgeDollarSign className="h-6 w-6" />}
                      {index === 3 && <ClipboardCheck className="h-6 w-6" />}
                    </div>

                    <ChevronDown
                      className={`h-6 w-6 text-white/80 transition-transform duration-300 ${
                        openStep === index ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openStep === index
                      ? 'max-h-96 px-6 pb-6 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-blue-100">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step cards - desktop full layout */}
        <div className="hidden md:block space-y-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="group rounded-2xl border border-white/15 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-2 bg-white/10">
                  <Icon className="w-6 h-6 text-blue-200" />
                </div>
                <div className="text-sm font-medium text-blue-200">
                  Step {index + 1}
                </div>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-blue-100">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* Location privacy - premium highlight block */}
        <div className="mt-16 rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-500/20 text-sky-200 ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Location privacy</h3>
              <p className="mt-3 text-blue-100">
                Tender locations show suburb and postcode only. Exact addresses remain private until you accept a quote.
              </p>
            </div>
          </div>
        </div>

        {/* Premium CTA block */}
        <div className="mt-20 text-center">
          <div className="rounded-2xl bg-white/10 p-10 backdrop-blur-md">
            <h2 className="text-2xl font-semibold md:text-3xl">
              Ready to price your next project?
            </h2>
            <p className="mt-4 text-blue-100">
              Post a tender, receive quotes, and stay in control.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {!currentUser && (
                <Link href="/signup">
                  <button className="rounded-xl bg-white px-8 py-4 font-semibold text-blue-700 transition hover:bg-blue-50">
                    Create free account
                  </button>
                </Link>
              )}
              <Link href="/">
                <button className="rounded-xl border border-white/30 bg-white/5 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
                  Back to home
                </button>
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
