'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { getSafeReturnUrl, safeRouterPush } from '@/lib/safe-nav';

export default function VerifyBusinessPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');
  const returnUrl = getSafeReturnUrl(returnUrlParam, '/dashboard');

  const [abn, setAbn] = useState('');
  const [businessName, setBusinessName] = useState(currentUser?.businessName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!abn.trim()) {
      setError('Please enter your ABN');
      setLoading(false);
      return;
    }

    if (abn.replace(/\s/g, '').length < 11) {
      setError('ABN must be 11 digits');
      setLoading(false);
      return;
    }

    try {
      currentUser.abn = abn.trim();
      if (businessName.trim()) {
        currentUser.businessName = businessName.trim();
      }

      console.log('[Verify Business] Verification complete, redirecting to:', returnUrl);
      safeRouterPush(router, returnUrl, '/dashboard');
    } catch (err) {
      setError('Failed to update business details. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    console.log('[Verify Business] Skipping verification, redirecting to dashboard');
    safeRouterPush(router, '/dashboard', '/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center mb-6">
          <Image src="/TradeHub -Horizontal-Main.svg" alt="TradeHub" width={180} height={40} className="h-10 w-auto" />
        </Link>

        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-gray-200">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
            Verify your business
          </h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            Verify your ABN to unlock business features such as posting jobs and applying for tenders.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Smith Construction"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="abn">Australian Business Number (ABN) *</Label>
              <Input
                id="abn"
                type="text"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="12 345 678 901"
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter your 11-digit ABN</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Verifying...' : 'Add ABN'}
              </Button>
              <Button type="button" variant="outline" onClick={handleSkip} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Not now
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Your ABN will be used to verify your business identity.</p>
            <p className="mt-1">
              You can update this later in your{' '}
              <Link href="/profile/edit" className="text-blue-600 hover:underline">
                profile settings
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
