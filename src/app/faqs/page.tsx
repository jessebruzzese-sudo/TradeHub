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
              What is a job on TradeHub?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              A job is a work opportunity posted by a business: scope, trade, timing, and location area. Subcontractors can apply or message through the platform; you agree details directly with the other party.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              How does pricing work?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Browsing is free. Premium plans unlock a wider discovery radius, more trades on your profile, availability tools, and other upgrades. See the Pricing page for current plans — TradeHub does not sell leads.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              Is my project location visible to everyone?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Listings show suburb and general area for relevance — not your full private address. Share exact site details in messages once you are comfortable.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              Does TradeHub sell leads?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              No. TradeHub does not sell your details as “leads.” Work comes from real listings and discovery; optional subscriptions expand reach — not pay-per-lead access to your phone number.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="bg-white border border-gray-200 rounded-xl px-6">
            <AccordionTrigger className="text-left font-bold text-gray-900 hover:no-underline py-4">
              Can I control business visibility on my profile?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600 pb-4">
              Yes. You can choose what appears on your public profile and use in-app messaging before sharing more. You can
              post jobs without ABN verification; verification is optional for posting and acts as a trust signal, and is
              required for some other actions such as applying to jobs.
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
