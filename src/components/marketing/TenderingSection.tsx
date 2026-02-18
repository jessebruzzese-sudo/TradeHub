import Link from 'next/link';
import { Button } from '@/components/ui/button';

const stepBadgeClass = (n: number) => {
  if (n === 1) return 'bg-blue-600';
  if (n === 2) return 'bg-gray-900';
  if (n === 3) return 'bg-emerald-600';
  return 'bg-indigo-600';
};

export default function TenderingSection() {
  return (
    <section id="how-tendering-works" className="scroll-mt-24 bg-gray-50 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">How tendering works</h2>
          <p className="mx-auto max-w-3xl text-sm text-gray-600 md:text-base">
            <span className="font-semibold text-gray-900">Tendering on TradeHub means Project Tenders.</span> It&apos;s not a
            job listing — it&apos;s for projects where you want pricing from multiple trade businesses. You pick the trades
            you need, and relevant companies can submit quotes to bid on the work.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { n: 1, t: 'Post the project', d: 'Upload plans/scopes and add key details so trades can price accurately.' },
            { n: 2, t: 'Select trades + radius', d: 'Choose required trades and set the radius so only relevant businesses see it.' },
            { n: 3, t: 'Receive multiple quotes', d: 'Multiple companies submit quotes to bid. Message to clarify inclusions.' },
            { n: 4, t: 'Award the work', d: 'Compare price, timing, and reputation — then award the project to who you choose.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${stepBadgeClass(
                    s.n
                  )}`}
                >
                  {s.n}
                </span>
                <h3 className="text-base font-bold text-gray-900">{s.t}</h3>
              </div>
              <p className="text-sm text-gray-700">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/tenders/create">
            <Button className="w-full sm:w-auto">Post a Project Tender</Button>
          </Link>
          <Link href="/tenders" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              View Project Tenders
            </Button>
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
