'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Target, DollarSign, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function HowTenderingWorksPage() {
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
              <Button size="sm" onClick={() => router.push(currentUser.role === 'admin' ? '/admin' : '/dashboard')}>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">How project tendering works</h1>
          <p className="text-base text-gray-600">
            A transparent process for pricing construction projects
          </p>
        </div>

        <div className="space-y-6 mb-12">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-600 mb-2">Step 1</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Upload plans</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Upload drawings, scopes, or specifications for your project. Only suburb and postcode are shown to contractors — your exact address stays private until you accept a quote.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-600 mb-2">Step 2</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Select trades & radius</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Choose which trades you need quotes from and set your search radius. Control how many quotes you want to receive and who can see your tender.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-600 mb-2">Step 3</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Receive quotes</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Verified contractors submit quotes directly through the platform. Compare pricing, review contractor profiles, and communicate before making your decision. No paid leads.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-600 mb-2">Step 4</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Convert to job</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Message contractors, shortlist your favorites, and convert a tender into a confirmed job when you're ready. All communication stays organized within the platform.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Location privacy</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Tender locations show only suburb and postcode. Exact addresses are never shared until you choose to accept a quote and convert to a job. This protects your project details while enabling radius-based contractor matching.
          </p>
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
