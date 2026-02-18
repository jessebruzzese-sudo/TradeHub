import {
  Briefcase,
  CalendarCheck,
  BadgeCheck,
  CircleCheck as CheckCircle2,
} from 'lucide-react';

export default function HowItWorksSection() {
  return (
    <section id="how-tradehub-works" className="scroll-mt-24 bg-gray-50 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">How TradeHub works</h2>
          <p className="text-sm text-gray-600 md:text-base">
            Built to help businesses stay busy, flexible, and in control — without lead fees.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-slate-200 p-2">
                <Briefcase className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Be your own agency</h3>
                <p className="mt-1 text-sm text-gray-700">
                  TradeHub lets you operate like your own labour agency. Post job listings or project tenders when work appears,
                  reach verified local trades, and fill gaps quickly — without recruiters or phone trees.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {[
                    'Post short-term or ongoing work',
                    'Reach trades by trade + distance',
                    'Compare availability and responses in one place',
                    'Hire directly — no commissions or lead fees',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-emerald-100 p-2">
                <CalendarCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Fill the gaps in your schedule</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Trades can list availability ahead of time or respond to relevant work nearby. Instead of chasing leads,
                  you get contacted for real jobs that fit your trade, location, and timing.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {[
                    'List available days or weeks',
                    'Get contacted for relevant work',
                    'Quote real projects — not bought leads',
                    'Stay flexible without over-committing',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-indigo-100 p-2">
                <BadgeCheck className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Build a profile that works for you</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Your TradeHub profile becomes a professional snapshot of your business — trade, experience, location, and reliability —
                  helping the right people trust and contact you.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {[
                    'Trade, location, and business details',
                    'Work history and portfolio',
                    'Reliability and communication reviews',
                    'Clear signals that build trust over time',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-700" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
