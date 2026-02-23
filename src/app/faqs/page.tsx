'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function FAQsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Button size="sm" onClick={() => router.push(isAdmin(currentUser) ? '/admin' : '/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost">Log in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Create account</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-base text-gray-600">
            Everything you need to know about TradeHub
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4 mb-12">
          <AccordionItem value="item-1" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              What is the difference between a tender and a job?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              A tender is a pricing request where you upload plans and receive multiple quotes from contractors. Once you accept a quote, you can convert it into a confirmed job with messaging and coordination. Jobs are ongoing work arrangements, while tenders are the quoting phase.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              How does pricing work?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Everyone gets free access to browse tenders and jobs, with 1 trial tender included. After that, pay per tender or subscribe to Premium ($29/month) for unlimited tenders, quotes, multi-trade access, alerts, and market rate insights. One account type for everyone — no lead selling.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              Is my project location visible to everyone?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              No. Tenders only show suburb and postcode — never your exact address. This protects your privacy while enabling contractors to assess distance. Exact addresses are shared only after you accept a quote and create a job.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              Does TradeHub sell leads?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              No. TradeHub never sells leads. Contractors access tenders through flat monthly subscriptions (or 1 free quote per month). There are no per-lead fees. You control who sees your tender based on radius and trade selection.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              Can I hide my business name when posting a tender?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Yes. You can choose to hide your business name when posting a tender. Contractors will see "Verified Builder" instead. This is useful when pricing competitively or working with unknown contractors.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              How does verification work?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Verification is optional but recommended. Submit business documents, ABN, or alternative identification. Verified users get better visibility and build trust faster. You can use TradeHub unverified, but verification significantly improves connection quality.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-7" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              What trades does TradeHub support?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              TradeHub supports all major construction trades including electricians, plumbers, carpenters, painters, builders, concreters, and many more. Premium users can add multiple trades to their profile for more opportunities.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-8" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              How do reliability reviews work?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Reliability reviews are context-focused and designed for situations like late cancellations or no-shows. Both parties can share their perspective, and all reviews are moderated for fairness. This system helps build trust while maintaining professional standards.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-3">
          {!currentUser && (
            <Link href="/signup">
              <Button size="lg" className="w-full">
                Create account
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full">
              Back to home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
