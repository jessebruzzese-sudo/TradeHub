'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { AlertCircle, Check, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
type Day = (typeof DAYS_OF_WEEK)[number];

type Props = {
  role: UserRole;
};

export default function SignupForm({ role }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');

  const { signup, currentUser, isLoading } = useAuth();

  const totalSteps = 6;

  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryTrade, setPrimaryTrade] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [abn, setAbn] = useState('');
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');

  const [availability, setAvailability] = useState<Record<Day, boolean>>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already authed, bounce to returnUrl/dashboard (prevents “signup while logged in” weirdness)
  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) return;

    const defaultUrl = '/dashboard';
    const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
    safeRouterReplace(router, safeReturnUrl, defaultUrl);
  }, [isLoading, currentUser, router, returnUrlParam]);

  const cleanName = useMemo(() => name.trim(), [name]);
  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validateEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const validatePassword = (v: string): { valid: boolean; message?: string } => {
    const pwd = v ?? '';
    if (pwd.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };

    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    if (!hasLetter || !hasNumber) {
      return { valid: false, message: 'Password must contain at least one letter and one number' };
    }

    return { valid: true };
  };

  const clampStep = (n: number) => Math.max(1, Math.min(totalSteps, n));

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!cleanName) return setError('Please enter your full name');
      if (cleanName.length < 2) return setError('Name must be at least 2 characters');

      if (!cleanEmail) return setError('Please enter your email address');
      if (!validateEmail(cleanEmail)) return setError('Please enter a valid email address');

      const pv = validatePassword(password);
      if (!pv.valid) return setError(pv.message || 'Password does not meet requirements');
    }

    if (step === 2) {
      if (!primaryTrade) return setError('Please select your primary trade');
    }

    if (step === 4) {
      if (!location.trim()) return setError('Please select your business location');
      if (!postcode.trim()) return setError('Please select a complete location with postcode');
    }

    setStep((s) => clampStep(s + 1));
  };

  const handleBack = () => {
    setError('');
    setStep((s) => clampStep(s - 1));
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);

    if (role !== 'contractor' && role !== 'subcontractor') {
      setError('Invalid role selected');
      setLoading(false);
      return;
    }

    // Final full validation (use cleaned values)
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter a valid name (at least 2 characters)');
      setLoading(false);
      return;
    }
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    const pv = validatePassword(password);
    if (!pv.valid) {
      setError(pv.message || 'Password does not meet requirements');
      setLoading(false);
      return;
    }
    if (!primaryTrade) {
      setError('Please select your primary trade');
      setLoading(false);
      return;
    }
    if (!location.trim() || !postcode.trim()) {
      setError('Please select a complete location with postcode');
      setLoading(false);
      return;
    }

    try {
      // ✅ IMPORTANT: Your current auth-context signup signature expects:
      // signup(name, email, password, role, profile)
      // (Your screenshot shows the 4th param is a LegacyRole, so passing the profile there fails.)
      const profile = {
        businessName: businessName.trim() || undefined,
        abn: abn.trim() || undefined,
        location: location.trim() || undefined,
        postcode: postcode.trim() || undefined,
        availability,

        // Trade is used by your UI, but your auth-context type may not include it yet.
        // Casting the payload avoids the "unused @ts-expect-error" + keeps build green.
        trade: primaryTrade,
      } as any;

      await signup(cleanName, cleanEmail, password, role, profile);

      const defaultUrl = '/dashboard';
      const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
      safeRouterReplace(router, safeReturnUrl, defaultUrl);
    } catch (err: any) {
      console.error('Signup error:', err);

      // auth-context normalizes duplicates to DUPLICATE_EMAIL
      if (err?.code === 'DUPLICATE_EMAIL' || err?.message === 'DUPLICATE_EMAIL') {
        setError('DUPLICATE_EMAIL');
        return;
      }

      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginHref = `/login${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col justify-center py-8 pb-8">
      <div className="w-full px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-md">
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

          <h2 className="text-center text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href={loginHref} className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>

          {/* Stepper */}
          <div className="mt-8 mb-6 px-2">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const n = i + 1;
                const isDone = n < step;
                const isCurrent = n === step;

                return (
                  <div key={n} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isDone
                          ? 'bg-green-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : n}
                    </div>

                    {i < totalSteps - 1 && (
                      <div className={`w-8 h-0.5 ${isDone ? 'bg-green-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-3 text-sm text-gray-600">
              Step {step} of {totalSteps}
            </div>
          </div>

          <div className="w-full bg-white p-5 sm:p-6 shadow-sm rounded-xl border border-gray-200">
            {/* Errors */}
            {error && error === 'DUPLICATE_EMAIL' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                  <p className="text-sm text-blue-900 font-medium">
                    An account with this email already exists. Please sign in instead.
                  </p>
                </div>
                <Link
                  href={loginHref}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Create your trade business account</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Join TradeHub to post jobs when you need labour and find work when you have capacity.
                  </p>
                </div>

                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-r-md"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters, including a letter and a number.</p>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Select your primary trade</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Choose the trade you primarily work in. This helps match you with relevant opportunities.
                  </p>
                </div>

                <div>
                  <Label htmlFor="primaryTrade">Primary Trade *</Label>
                  <Select value={primaryTrade} onValueChange={setPrimaryTrade}>
                    <SelectTrigger className="mt-1" id="primaryTrade">
                      <SelectValue placeholder="Select your primary trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_CATEGORIES.map((trade) => (
                        <SelectItem key={trade} value={trade}>
                          {trade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Business details</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    You can list availability and apply for work now. ABN verification is only needed for posting jobs and
                    applying for tenders.
                  </p>
                </div>

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
                </div>

                <div>
                  <Label htmlFor="abn">ABN (Optional)</Label>
                  <Input
                    id="abn"
                    type="text"
                    value={abn}
                    onChange={(e) => setAbn(e.target.value)}
                    placeholder="12 345 678 901"
                    className="mt-1"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required to post jobs and apply for tenders</p>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Set your location</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Tell us where you operate to help match you with local work opportunities.
                  </p>
                </div>

                <div>
                  <Label htmlFor="location">Business Location</Label>
                  <SuburbAutocomplete
                    value={location}
                    postcode={postcode}
                    onSuburbChange={setLocation}
                    onPostcodeChange={setPostcode}
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Premium lets you expand your work radius to find more jobs and apply for more tenders.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Set your availability</h3>
                  <p className="text-sm text-gray-600 mb-2">Let others know when you are typically available for work.</p>
                  <p className="text-xs text-gray-500">You can change this anytime from your profile.</p>
                </div>

                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center gap-3">
                      <Checkbox
                        id={day}
                        checked={availability[day]}
                        onCheckedChange={(checked) => {
                          const next = checked === true; // treat "indeterminate" as false
                          setAvailability((prev) => ({ ...prev, [day]: next }));
                        }}
                      />
                      <Label htmlFor={day} className="cursor-pointer font-normal">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6 */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Review and confirm</h3>
                  <p className="text-sm text-gray-600 mb-6">Check your details before creating your account.</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">Name</div>
                    <div className="text-gray-600">{cleanName}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Email</div>
                    <div className="text-gray-600">{cleanEmail}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Primary Trade</div>
                    <div className="text-gray-600">{primaryTrade}</div>
                  </div>
                  {businessName.trim() && (
                    <div>
                      <div className="font-medium text-gray-900">Business Name</div>
                      <div className="text-gray-600">{businessName.trim()}</div>
                    </div>
                  )}
                  {abn.trim() && (
                    <div>
                      <div className="font-medium text-gray-900">ABN</div>
                      <div className="text-gray-600">{abn.trim()}</div>
                    </div>
                  )}
                  {location.trim() && (
                    <div>
                      <div className="font-medium text-gray-900">Location</div>
                      <div className="text-gray-600">
                        {location.trim()}
                        {postcode.trim() ? `, ${postcode.trim()}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1" disabled={loading}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {step < totalSteps ? (
                <Button type="button" onClick={handleNext} className="flex-1" disabled={loading || error === 'DUPLICATE_EMAIL'}>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSignup} disabled={loading} className="flex-1">
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
