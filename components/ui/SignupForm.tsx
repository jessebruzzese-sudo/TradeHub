'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/lib/types';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { Info, ChevronRight, ChevronLeft, Check, Briefcase, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Props = {
  role: UserRole;
};

export default function SignupForm({ role }: Props) {
  const [step, setStep] = useState(1);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryTrade, setPrimaryTrade] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [abn, setAbn] = useState('');
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radius, setRadius] = useState('50');
  const [availability, setAvailability] = useState<{ [key: string]: boolean }>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup, currentUser, isLoading} = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');

  const totalSteps = 6;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password || password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' };
    }
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    // Basic strength: at least one letter and one number
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return { valid: false, message: 'Password must contain at least one letter and one number' };
    }
    return { valid: true };
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Please enter your full name');
        return;
      }
      if (trimmedName.length < 2) {
        setError('Name must be at least 2 characters');
        return;
      }
      
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError('Please enter your email address');
        return;
      }
      if (!validateEmail(trimmedEmail)) {
        setError('Please enter a valid email address');
        return;
      }
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.message || 'Password does not meet requirements');
        return;
      }
    }

    if (step === 2 && !primaryTrade) {
      setError('Please select your primary trade');
        return;
    }

    if (step === 4) {
      if (!location.trim()) {
        setError('Please select your business location');
        return;
      }
      if (!postcode.trim()) {
        setError('Please select a complete location with postcode');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSkipAvailability = () => {
    setError('');
    setStep(step + 1);
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);

    if (role !== 'contractor' && role !== 'subcontractor') {
      setError('Invalid role selected');
      setLoading(false);
      return;
    }

    // Validate all required fields before submission
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter a valid name (at least 2 characters)');
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || 'Password does not meet requirements');
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
      await signup(name, email, password, role, primaryTrade, {
        businessName,
        abn,
        location,
        postcode,
        availability
      });

      const defaultUrl = '/dashboard';
      const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
      console.log('[Signup] Signup successful, redirecting to:', safeReturnUrl);
      safeRouterReplace(router, safeReturnUrl, defaultUrl);
    } catch (err: any) {
      console.error('Signup error:', err);

      // Check for duplicate email error (from auth-context)
      // auth-context.tsx already normalizes all duplicate email errors to DUPLICATE_EMAIL
      if (err?.code === 'DUPLICATE_EMAIL' || err?.message === 'DUPLICATE_EMAIL') {
        setError('DUPLICATE_EMAIL');
        setLoading(false);
        return; // Stop signup flow immediately - do not proceed
      }

      // For any other error, show generic message (auth-context already sanitizes errors)
      setError(err?.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col justify-center py-8 pb-8">
      <div className="w-full px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-md">
          <Link href="/" className="flex justify-center mb-6">
            <Image src="/TradeHub -Horizontal-Main.svg" alt="TradeHub" width={180} height={40} className="h-10 w-auto" />
          </Link>
          <h2 className="text-center text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href={`/login${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`} className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>

          <div className="mt-8 mb-6 px-2">
            <div className="flex items-center justify-center gap-2">
              {[...Array(totalSteps)].map((_, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      i + 1 < step
                        ? 'bg-green-600 text-white'
                        : i + 1 === step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div
                      className={`w-8 h-0.5 ${
                        i + 1 < step ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-3 text-sm text-gray-600">
              Step {step} of {totalSteps}
            </div>
          </div>

          <div className="w-full bg-white p-5 sm:p-6 shadow-sm rounded-xl border border-gray-200">
          {error && error === 'DUPLICATE_EMAIL' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                <p className="text-sm text-blue-900 font-medium">
                  An account with this email already exists. Please sign in instead.
                </p>
              </div>
              <Link
                href={`/login${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`}
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
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-r-md"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
              </div>
            </div>
          )}

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
                  <SelectTrigger className="mt-1">
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

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Business details</h3>
                <p className="text-sm text-gray-600 mb-6">
                  You can list availability and apply for work now. ABN verification is only needed for posting jobs and applying for tenders.
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
                />
                <p className="text-xs text-gray-500 mt-1">Required to post jobs and apply for tenders</p>
              </div>
            </div>
          )}

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

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Set your availability</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Let others know when you are typically available for work.
                </p>
                <p className="text-xs text-gray-500">
                  You can change this anytime from your profile.
                </p>
              </div>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <Checkbox
                      id={day}
                      checked={availability[day]}
                      onCheckedChange={(checked) =>
                        setAvailability({ ...availability, [day]: checked as boolean })
                      }
                    />
                    <Label htmlFor={day} className="cursor-pointer font-normal">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Review and confirm</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Check your details before creating your account.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">Name</div>
                  <div className="text-gray-600">{name}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Email</div>
                  <div className="text-gray-600">{email}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Primary Trade</div>
                  <div className="text-gray-600">{primaryTrade}</div>
                </div>
                {businessName && (
                  <div>
                    <div className="font-medium text-gray-900">Business Name</div>
                    <div className="text-gray-600">{businessName}</div>
                  </div>
                )}
                {abn && (
                  <div>
                    <div className="font-medium text-gray-900">ABN</div>
                    <div className="text-gray-600">{abn}</div>
                  </div>
                )}
                {location && (
                  <div>
                    <div className="font-medium text-gray-900">Location</div>
                    <div className="text-gray-600">{location}{postcode ? `, ${postcode}` : ''}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {step < totalSteps ? (
              <Button
  type="button"
  onClick={handleNext}
  className="flex-1"
  disabled={error === 'DUPLICATE_EMAIL'}
>

                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            )}
          </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
