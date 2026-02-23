'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Upload, Target, BadgeDollarSign, ClipboardCheck, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { useRouter } from 'next/navigation';
import { GlobalFooter } from '@/components/global-footer';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: 'easeOut' } },
};

function StepBadge({ stepNum }: { stepNum: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-white/25 via-white/10 to-white/25 px-3 py-1 text-xs font-semibold text-white shadow-sm">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-white/40 to-white/10 text-[11px] font-bold">
        {stepNum}
      </span>
      Step {stepNum}
    </span>
  );
}

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
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#2563eb] text-white">
      {/* Watermark layer */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Mobile */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 md:hidden opacity-[0.15]">
          <div className="w-[260px] max-w-[80vw]">
            <Image
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              width={520}
              height={520}
              className="h-auto w-full object-contain"
              priority={false}
            />
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:block absolute right-[-8%] bottom-[-10%] opacity-[0.15]">
          <div className="w-[1100px] lg:w-[1500px] xl:w-[1800px]">
            <Image
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              width={1800}
              height={1800}
              className="h-auto w-full object-contain"
              priority={false}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
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
          <div className="px-6 md:px-0 flex justify-center mb-6 md:mb-10">
            <Link href="/" className="group">
              <Image
                src="/tradehub-white.png"
                alt="TradeHub"
                width={360}
                height={90}
                priority
                className="
                  w-full
                  max-w-[360px]
                  sm:max-w-[420px]
                  md:max-w-[460px]
                  h-auto
                  mx-auto
                  opacity-95
                  drop-shadow-[0_3px_10px_rgba(0,0,0,0.25)]
                  relative z-20
                "
              />
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
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="md:hidden space-y-6"
        >
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div key={index} variants={item} className="relative">
                <div
                  className={`relative rounded-2xl border border-white/20 bg-white/5 p-8 shadow-xl backdrop-blur-md transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 before:transition ${
                    openStep === index
                      ? 'border-white/50 shadow-2xl before:opacity-100'
                      : 'hover:-translate-y-1 hover:shadow-2xl hover:border-white/40 hover:before:opacity-100'
                  }`}
                >
                  <div className="mb-3">
                    <StepBadge stepNum={index + 1} />
                  </div>
                  <button
                    onClick={() =>
                      setOpenStep(openStep === index ? null : index)
                    }
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div className="min-w-0">
                      <h3 className="text-2xl font-semibold text-white">
                        {step.title}
                      </h3>
                    </div>

                  {/* Right-side large icon + chevron */}
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Accent Icon Box */}
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-xl bg-white/10 p-3 shadow-md transition-all duration-300 ${
                        openStep === index
                          ? 'scale-105'
                          : ''
                      } ${
                        index === 0
                          ? 'text-emerald-300'
                          : index === 1
                          ? 'text-sky-300'
                          : index === 2
                          ? 'text-amber-300'
                          : 'text-indigo-300'
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
                      ? 'max-h-96 pt-4 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-blue-100">{step.description}</p>
                </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Step cards - desktop full layout */}
        <div className="relative hidden md:block">
          {/* Connector layer - desktop only */}
          <div className="pointer-events-none absolute left-1/2 top-6 hidden h-[calc(100%-3rem)] w-px -translate-x-1/2 md:block">
            <div className="h-full w-px bg-white/15" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/35 to-transparent opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] animate-th-scan" />
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="relative space-y-8"
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div key={index} variants={item} className="relative">
                  {/* Node dot - desktop only */}
                  <div className="pointer-events-none absolute left-1/2 top-10 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-white/35 shadow-[0_0_0_6px_rgba(255,255,255,0.06)] md:block" />
                  <div className="group relative rounded-2xl border border-white/20 bg-white/5 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/40 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 before:transition hover:before:opacity-100">
                    <div className="mb-3">
                      <StepBadge stepNum={index + 1} />
                    </div>
                    <div className="rounded-xl bg-white/10 p-3 shadow-md mb-2 flex w-fit items-center justify-center">
                      <Icon className="h-6 w-6 text-blue-200" />
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold">{step.title}</h3>
                    <p className="mt-3 text-blue-100">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
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
      <div className="relative z-10">
        <GlobalFooter />
      </div>
      <style jsx global>{`
        @keyframes th-scan {
          0% { transform: translateY(-20%); opacity: 0; }
          15% { opacity: .7; }
          85% { opacity: .7; }
          100% { transform: translateY(20%); opacity: 0; }
        }
        .animate-th-scan { animation: th-scan 3.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
