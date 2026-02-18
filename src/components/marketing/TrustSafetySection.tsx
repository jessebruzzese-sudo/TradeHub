import { UserCheck, ShieldCheck, MessageSquare } from 'lucide-react';

export default function TrustSafetySection() {
  return (
    <section id="trust" className="scroll-mt-24 bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Trust & Safety</h2>
          <p className="text-sm text-gray-600 md:text-base">
            Built for real trade businesses — verification signals, reputation, and clear accountability.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-300 bg-gray-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-slate-200 p-2">
                <UserCheck className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Profiles & reputation</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Work history, reviews, and reliability signals build trust over time.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-300 bg-gray-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-blue-100 p-2">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verification signals</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Clear status pills for checks (like ABN/verification) where applicable.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-300 bg-gray-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-emerald-100 p-2">
                <MessageSquare className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">On-platform messaging</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Keep conversations organised with job-based threads and history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
