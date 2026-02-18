import Link from 'next/link';
import { ArrowRight, ShieldCheck, MessageSquare, BadgeCheck } from 'lucide-react';

import { MarketingPageLayout } from '@/components/marketing-page-layout';
import TrustSafetySection from '@/components/marketing/TrustSafetySection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Trust & Safety | TradeHub',
  description:
    'TradeHub is built for trust: verification signals, reputation, and on-platform messaging for Plumbing, Electrical, Carpentry and trade businesses across Australia.',
};

export default function TrustSafetyPage() {
  return (
    <MarketingPageLayout>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-8">
        <div className="rounded-2xl border bg-gradient-to-b from-emerald-50 to-white p-8 shadow-sm">
          <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Trust & Safety
          </p>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Built for real trade businesses — with clear trust signals
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            TradeHub helps Plumbing, Electrical, Carpentry and other businesses connect with confidence —
            through verification signals, reputation, and on-platform messaging that keeps everything organised.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Create a free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: <BadgeCheck className="h-4 w-4 text-emerald-600" />,
                title: 'Verification signals',
                desc: 'Clear account signals and business details that build confidence over time.',
              },
              {
                icon: <ShieldCheck className="h-4 w-4 text-sky-600" />,
                title: 'Reputation & accountability',
                desc: 'Profiles and history help reduce unknowns and improve reliability.',
              },
              {
                icon: <MessageSquare className="h-4 w-4 text-orange-600" />,
                title: 'On-platform messaging',
                desc: 'Keep job and tender conversations in one place with a clean thread history.',
              },
            ].map((t) => (
              <Card key={t.title} className="border-emerald-100">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg border bg-white p-2">{t.icon}</div>
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-sm text-slate-600">{t.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <TrustSafetySection />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">What this means in practice</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium">Less noise, more quality</p>
              <p className="mt-1 text-sm text-slate-600">
                Connect with businesses relevant to your trade, location, and timing — not random spam enquiries.
              </p>
            </div>
            <div>
              <p className="font-medium">Clearer expectations</p>
              <p className="mt-1 text-sm text-slate-600">
                Keep details in the thread, clarify inclusions, and reduce disputes caused by missing info.
              </p>
            </div>
            <div>
              <p className="font-medium">More confidence to say yes</p>
              <p className="mt-1 text-sm text-slate-600">
                When you can see signals and history, it’s easier to commit to the right work.
              </p>
            </div>
            <div>
              <p className="font-medium">Professional communication</p>
              <p className="mt-1 text-sm text-slate-600">
                Keep everything on-platform so your team can pick up the conversation anytime.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
