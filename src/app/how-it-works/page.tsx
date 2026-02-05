'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { useRouter } from 'next/navigation';

export default function HowItWorksPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">How TradeHub works</h1>
          <p className="text-base text-gray-600">
            Connect with the right trades for your projects or find quality work opportunities
          </p>
        </div>

        <div className="space-y-6 mb-12">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Post a project or browse work</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Upload your construction project with plans and specifications to receive quotes from qualified contractors. Or browse available tenders and jobs that match your trade and location.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Match by trade & location</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Our radius-based matching system connects you with verified professionals in your area. You control the search radius and which trades see your projects.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Quote, message, and confirm</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Receive detailed quotes from interested contractors, communicate directly through our messaging system, and hire with confidence. No paid leads, no hidden fees.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Why TradeHub?</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">No lead selling — transparent pricing for everyone</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Direct communication between builders and trades</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Radius-based matching ensures local connections</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Trial tender included with every account</span>
            </li>
          </ul>
        </div>

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
