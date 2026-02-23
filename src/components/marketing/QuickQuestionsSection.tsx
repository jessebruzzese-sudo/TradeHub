'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FAQ_ITEMS = [
  { q: 'Is TradeHub a lead-selling marketplace?', a: 'No — TradeHub is built to connect trade businesses directly without the "pay per lead" race-to-the-bottom model.' },
  { q: 'Can I use it to find more work nearby?', a: 'Yes — your profile and availability help local businesses discover you when they need your trade.' },
  { q: 'Does it work for Plumbing, Electrical, Carpentry?', a: 'Absolutely — TradeHub is designed around real trade categories and local matching.' },
  { q: 'How do I get started?', a: 'Create your account, set your trade(s) and location, then list availability or respond to opportunities.' },
];

export function QuickQuestionsSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        {/* Mobile: collapsible layout */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold">Quick questions</h2>
            <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[800px]' : 'max-h-0'}`}>
            <div className="mt-4 grid gap-4">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q}>
                  <p className="font-medium">{item.q}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/signup">
                Create account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
          <div className="pointer-events-none mt-6 flex justify-center">
            <Image
              src="/TradeHub-Horizontal-Main.svg"
              alt="TradeHub"
              width={180}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>

        {/* Desktop: unchanged layout */}
        <div className="hidden md:block">
          <h2 className="text-xl font-semibold">Quick questions</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <p className="font-medium">{item.q}</p>
                <p className="mt-1 text-sm text-slate-600">{item.a}</p>
              </div>
            ))}
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
          <div className="pointer-events-none absolute bottom-6 right-6">
            <Image
              src="/TradeHub-Horizontal-Main.svg"
              alt="TradeHub"
              width={180}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
