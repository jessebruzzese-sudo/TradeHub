'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { getSafeReturnUrl, safeRouterPush } from '@/lib/safe-nav';

import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type VerifyResponse =
  | { ok: true; abn: string; businessName?: string; status?: string }
  | { error: string };

function normalizeAbn(input: string) {
  return (input || '').replace(/\s+/g, '');
}

function formatAbnPretty(input: string) {
  const s = normalizeAbn(input);
  // 11 digits -> 2 3 3 3 formatting: "12 345 678 901"
  if (s.length !== 11) return input;
  return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 8)} ${s.slice(8, 11)}`;
}

export default function VerifyBusinessPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnUrl = useMemo(() => {
    const returnUrlParam = searchParams.get('returnUrl');
    return getSafeReturnUrl(returnUrlParam, '/dashboard');
  }, [searchParams]);

  const [abn, setAbn] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill from currentUser (best-effort; names may differ depending on your user model)
  useEffect(() => {
    if (!currentUser) return;

    const existingBiz =
      // common shapes across TradeHub iterations
      (currentUser as any)?.business_name ??
      (currentUser as any)?.businessName ??
      '';

    const existingAbn =
      (currentUser as any)?.abn ??
      '';

    if (existingBiz && !businessName) setBusinessName(String(existingBiz));
    if (existingAbn && !abn) setAbn(formatAbnPretty(String(existingAbn)));
  }, [currentUser]); // intentionally not depending on abn/businessName to avoid loops

  if (!currentUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  const currentStatus =
    (currentUser as any)?.abn_status ??
    (currentUser as any)?.abnStatus ??
    'unverified';

  const isVerified = String(currentStatus).toLowerCase() === 'verified';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMsg('');
    setLoading(true);

    const cleaned = normalizeAbn(abn);

    if (!cleaned) {
      setError('Please enter your ABN');
      setLoading(false);
      return;
    }
    if (!/^\d{11}$/.test(cleaned)) {
      setError('ABN must be 11 digits');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/abn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abn: cleaned }),
      });

      const data = (await res.json().catch(() => ({}))) as VerifyResponse;

      if (!res.ok) {
        setError('error' in data && data.error ? data.error : 'ABN verification failed. Please try again.');
        setLoading(false);
        return;
      }

      // Success
      const biz = 'businessName' in data ? data.businessName : undefined;
      if (biz) setBusinessName(biz);
      setStatusMsg('ABN verified successfully.');

      // Redirect back (status will be fresh on next page load)
      safeRouterPush(router, returnUrl, '/dashboard');
    } catch (err) {
      console.error('[Verify Business] Error:', err);
      setError('Failed to verify ABN. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    safeRouterPush(router, '/dashboard', '/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center mb-6">
          <Image
            src="/TradeHub -Horizontal-Main.svg"
            alt="TradeHub"
            width={180}
            height={40}
            className="h-10 w-auto"
            priority
          />
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

          <p className="text-center text-sm text-gray-600 mb-4">
            Verify your ABN to unlock business features such as posting jobs and applying for tenders.
          </p>

          {/* Current status */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">ABN status</span>
              <span
                className={[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800',
                ].join(' ')}
              >
                {isVerified ? 'Verified' : String(currentStatus).replace(/_/g, ' ')}
              </span>
            </div>
            {isVerified ? (
              <p className="mt-2 text-xs text-gray-600">
                Your business is verified. You can update your details later in your profile settings.
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-600">
                Verification helps other businesses trust who they’re dealing with.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {statusMsg && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm mb-6 flex gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <span>{statusMsg}</span>
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
                autoComplete="organization"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional — we’ll also fetch this automatically when you verify.
              </p>
            </div>

            <div>
              <Label htmlFor="abn">Australian Business Number (ABN) *</Label>
              <Input
                id="abn"
                type="text"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                onBlur={() => setAbn((v) => formatAbnPretty(v))}
                placeholder="12 345 678 901"
                className="mt-1"
                required
                inputMode="numeric"
              />
              <p className="text-xs text-gray-500 mt-1">Enter your 11-digit ABN</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Verifying...' : isVerified ? 'Re-verify ABN' : 'Verify ABN'}
              </Button>

              <Button type="button" variant="outline" onClick={handleSkip} className="w-full" disabled={loading}>
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
