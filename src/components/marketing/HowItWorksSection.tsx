import { User, Search, Briefcase } from "lucide-react";

const steps = [
  {
    title: "Create your profile",
    shortDesc: "Add your trade, service area, and availability.",
    expandDesc:
      "Add your trade(s), where you work, and when you're available. Choose public or private visibility so you control who can see you.",
    Icon: User,
    iconBg: "bg-blue-50",
    iconFg: "text-blue-600",
    iconRing: "ring-1 ring-blue-200/70",
    accent: "from-blue-500/12 to-transparent",
  },
  {
    title: "Get discovered",
    shortDesc: "Trades near you can find your profile when searching by trade and suburb.",
    expandDesc:
      "Trades near you can find your profile when searching by trade and suburb. Your radius keeps it relevant — no spam.",
    Icon: Search,
    iconBg: "bg-emerald-50",
    iconFg: "text-emerald-600",
    iconRing: "ring-1 ring-emerald-200/70",
    accent: "from-emerald-500/12 to-transparent",
  },
  {
    title: "Win work",
    shortDesc: "Apply to jobs, quote tenders, and message directly.",
    expandDesc:
      "Apply to jobs, quote tenders, and message directly. No lead fees — you keep control of pricing and relationships.",
    Icon: Briefcase,
    iconBg: "bg-amber-50",
    iconFg: "text-amber-700",
    iconRing: "ring-1 ring-amber-200/70",
    accent: "from-amber-500/12 to-transparent",
  },
] as const;

export default function HowItWorksSection() {
  return (
    <section id="how-tradehub-works" className="scroll-mt-24 py-10 md:py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              How TradeHub works
            </h2>

            <div className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E73E8]">
              <img
                src="/tradehub-mark-white.svg"
                alt="TradeHub"
                className="h-[30px] w-[30px]"
                draggable={false}
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Built to help businesses stay busy, flexible, and in control — without lead fees.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.title}
              className="
                group relative overflow-hidden rounded-2xl
                bg-white/90 backdrop-blur
                border border-white/30
                shadow-[0_10px_30px_rgba(2,6,23,0.08)]
                hover:shadow-[0_18px_50px_rgba(2,6,23,0.14)]
                transition-all duration-300
                hover:-translate-y-0.5
              "
            >
              {/* sheen */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent opacity-70" />

              {/* accent glow */}
              <div
                className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${s.accent} blur-2xl opacity-80`}
              />

              <div className="relative p-6">
                <details className="group/details">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-3">
                      <div
                        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.iconRing} shadow-sm`}
                      >
                        <s.Icon className={`h-5 w-5 ${s.iconFg}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{s.title}</div>
                        <div className="text-sm text-gray-600">{s.shortDesc}</div>
                      </div>
                      <div className="mt-1 text-gray-400 transition-transform group-open/details:rotate-180">
                        ⌄
                      </div>
                    </div>
                  </summary>

                  <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {s.expandDesc}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
