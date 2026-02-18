import Link from 'next/link';
import { ArrowRight, Briefcase, CalendarCheck, MapPin, Wrench } from 'lucide-react';

import { MarketingPageLayout } from '@/components/marketing-page-layout';
import HowItWorksSection from '@/components/marketing/HowItWorksSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'How TradeHub Works | TradeHub Australia',
  description:
    'Run your trade business like your own agency. Find more work, fill schedule gaps, and connect with Plumbing, Electrical, Carpentry and more — without lead fees.',
};

export default function HowItWorksPage() {
  return (
    <MarketingPageLayout>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-8">
        <div className="rounded-2xl border bg-gradient-to-b from-sky-50 to-white p-8 shadow-sm">
          <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
            <Briefcase className="h-4 w-4 text-sky-600" />
            Built for real trade businesses
          </p>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Operate like your own agency — and find more work without lead fees
          </h1>

          <p className="mt-3 max-w-2xl text-base text-slate-600">
            TradeHub helps Plumbing, Electrical, Carpentry and other trade businesses stay busy.
            List availability, get discovered locally, and turn conversations into real jobs.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Create a free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/tendering">See how tendering works</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Card className="border-sky-100">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border bg-white p-2">
                    <MapPin className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-medium">Local relevance</p>
                    <p className="text-sm text-slate-600">
                      Get found by nearby businesses looking for your trade.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sky-100">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border bg-white p-2">
                    <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">Fill schedule gaps</p>
                    <p className="text-sm text-slate-600">
                      List available days/weeks and get contacted for real work.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sky-100">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border bg-white p-2">
                    <Wrench className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Built for trades</p>
                    <p className="text-sm text-slate-600">
                      Profiles, messaging, verification signals — all designed for trade businesses.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ORIGINAL SECTION (your 3-column block) */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <HowItWorksSection />
      </section>

      {/* USE CASES BY TRADE */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-semibold">Popular ways trade businesses use TradeHub</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Whether you’re a small team or growing fast, TradeHub helps you win work and stay booked.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Plumbing',
              bullets: ['Overflow work when you’re booked out', 'Emergency call-outs and same-week gaps', 'Local builder relationships'],
            },
            {
              title: 'Electrical',
              bullets: ['Switchboard upgrades + compliance work', 'Ongoing maintenance opportunities', 'Short-term labour for big weeks'],
            },
            {
              title: 'Carpentry',
              bullets: ['Framing + fit-off support', 'Reliable crews for peak periods', 'Small projects between larger builds'],
            },
          ].map((c) => (
            <Card key={c.title} className="shadow-sm">
              <CardContent className="p-5">
                <p className="text-lg font-semibold">{c.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Quick questions</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium">Is TradeHub a lead-selling marketplace?</p>
              <p className="mt-1 text-sm text-slate-600">
                No — TradeHub is built to connect trade businesses directly without the “pay per lead” race-to-the-bottom model.
              </p>
            </div>
            <div>
              <p className="font-medium">Can I use it to find more work nearby?</p>
              <p className="mt-1 text-sm text-slate-600">
                Yes — your profile and availability help local businesses discover you when they need your trade.
              </p>
            </div>
            <div>
              <p className="font-medium">Does it work for Plumbing, Electrical, Carpentry?</p>
              <p className="mt-1 text-sm text-slate-600">
                Absolutely — TradeHub is designed around real trade categories and local matching.
              </p>
            </div>
            <div>
              <p className="font-medium">How do I get started?</p>
              <p className="mt-1 text-sm text-slate-600">
                Create your account, set your trade(s) and location, then list availability or respond to opportunities.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Create account <ArrowRight className="ml-2 h-4 w-4" />
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
