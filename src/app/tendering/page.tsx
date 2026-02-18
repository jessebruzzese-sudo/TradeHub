import Link from 'next/link';
import { ArrowRight, FileText, Users, DollarSign, MapPin } from 'lucide-react';

import { MarketingPageLayout } from '@/components/marketing-page-layout';
import TenderingSection from '@/components/marketing/TenderingSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'How Tendering Works | TradeHub',
  description:
    'TradeHub Project Tenders help trade businesses win more work: builders post projects, select trades + radius, and receive multiple quotes from Plumbing, Electrical, Carpentry and more.',
};

export default function TenderingPage() {
  return (
    <MarketingPageLayout>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-8">
        <div className="rounded-2xl border bg-gradient-to-b from-orange-50 to-white p-8 shadow-sm">
          <p className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
            <FileText className="h-4 w-4 text-orange-600" />
            Project Tenders
          </p>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Win better projects with TradeHub tendering
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            TradeHub tendering is built for projects where builders want multiple quotes — and trade businesses want real work,
            not bought leads. Great for Plumbing, Electrical, Carpentry and more.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/tenders">
                View tenders <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              { icon: <MapPin className="h-4 w-4 text-sky-600" />, title: 'Trade + radius', desc: 'Target only relevant local businesses.' },
              { icon: <Users className="h-4 w-4 text-emerald-600" />, title: 'Multiple quotes', desc: 'Builders compare pricing and timing.' },
              { icon: <DollarSign className="h-4 w-4 text-orange-600" />, title: 'No lead fees', desc: 'Quotes are real opportunities.' },
              { icon: <FileText className="h-4 w-4 text-slate-700" />, title: 'Clear scope', desc: 'Upload plans/specs and clarify in-thread.' },
            ].map((t) => (
              <Card key={t.title} className="border-orange-100">
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
        <TenderingSection />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Good fits for tendering</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Tendering works best when scope is clear and you want to win work on quality — not speed or spam.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { title: 'New builds', desc: 'Multiple trades quoting from plans and specs.' },
              { title: 'Renovations', desc: 'Clear inclusions, timeline, and site details.' },
              { title: 'Commercial fit-outs', desc: 'Compare capability, availability, and pricing.' },
            ].map((x) => (
              <Card key={x.title}>
                <CardContent className="p-5">
                  <p className="font-semibold">{x.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{x.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/tenders">
                Browse tenders <ArrowRight className="ml-2 h-4 w-4" />
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
