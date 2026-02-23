import Link from "next/link";
import { User, Search, Briefcase, ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Create your profile",
    shortDesc: "Add your trade, service area, and availability.",
    expandDesc:
      "Add your trade(s), where you work, and when you're available. Choose public or private visibility so you control who can see you.",
    Icon: User,
    cardClasses: "bg-blue-50/60 border-blue-100",
    iconClasses: "border-blue-100 bg-blue-50 text-blue-600",
  },
  {
    title: "Get discovered",
    shortDesc: "Trades near you can find your profile when searching by trade and suburb.",
    expandDesc:
      "Trades near you can find your profile when searching by trade and suburb. Your radius keeps it relevant — no spam.",
    Icon: Search,
    cardClasses: "bg-emerald-50/60 border-emerald-100",
    iconClasses: "border-emerald-100 bg-emerald-50 text-emerald-600",
  },
  {
    title: "Win work",
    shortDesc: "Apply to jobs, quote tenders, and message directly.",
    expandDesc:
      "Apply to jobs, quote tenders, and message directly. No lead fees — you keep control of pricing and relationships.",
    Icon: Briefcase,
    cardClasses: "bg-amber-50/60 border-amber-100",
    iconClasses: "border-amber-100 bg-amber-50 text-amber-600",
  },
] as const;

const STEP_HREFS = ["/how-it-works", "/how-it-works/subcontractors", "/how-tendering-works"] as const;

export default function HowItWorksSection() {
  return (
    <>
      {/* Mobile: stacked list */}
      <div className="space-y-3 md:hidden">
        {steps.map((s, i) => (
          <Link
            key={s.title}
            href={STEP_HREFS[i]}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${s.iconClasses}`}
              >
                <s.Icon className="h-5 w-5" />
              </div>
              <span className="font-semibold text-slate-900">{s.title}</span>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>

      {/* Desktop: immersive tiles */}
      <div className="hidden gap-6 md:grid md:grid-cols-3">
      {steps.map((s, i) => (
        <Link
          key={s.title}
          href={STEP_HREFS[i]}
          className={`group block rounded-2xl border p-6 shadow-sm transition hover:shadow-md ${s.cardClasses}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${s.iconClasses}`}
            >
                <s.Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.shortDesc}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:underline">
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
        </Link>
      ))}
      </div>
    </>
  );
}
