'use client';

export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TradeMultiSelect } from '@/components/trade-multiselect';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';

import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Building2,
  Wrench,
  MapPin,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-slate-100 p-2">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<'contractor' | 'subcontractor' | 'supplier'>('contractor');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tradeCategories, setTradeCategories] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [abn, setAbn] = useState('');
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  const [availability, setAvailability] = useState<Record<string, boolean>>({
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

  const { signup, currentUser } = useAuth();
  // TODO: Map to real field if different (e.g. subscription_tier vs active_plan/is_premium)
  const isPremium = currentUser?.isPremium === true;
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');

  const totalSteps = 7;

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tradehub_signup_account_type', accountType);
      }
    }

    if (step === 2) {
      if (!name.trim()) return setError('Please enter your full name');
      if (!email.trim()) return setError('Please enter your email address');
      if (!password || password.length < 6) return setError('Password must be at least 6 characters');
    }

    if (step === 3 && tradeCategories.length === 0) {
      return setError('Please select at least one trade.');
    }

    if (step === 5) {
      if (!location.trim()) return setError('Please select your business location');
      if (!postcode.trim()) return setError('Please select a complete location with postcode');
    }

    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      // Backward compat: backend expects primary_trade (single). TODO: migrate fully to trade_categories.
      const primaryTrade = tradeCategories[0] ?? null;
      await signup(name, email, password, primaryTrade, {
        businessName,
        abn,
        location,
        postcode,
        availability,
        tradeCategories,
      });

      const defaultUrl = '/dashboard';
      const safeReturnUrl = getSafeReturnUrl(returnUrlParam, defaultUrl);
      console.log('[Signup] Signup successful, redirecting to:', safeReturnUrl);
      safeRouterReplace(router, safeReturnUrl, defaultUrl);
    } catch (err: any) {
      console.error('[Signup] Signup error:', err);

      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate') || msg.includes('unique')) {
        setError('DUPLICATE_EMAIL');
      } else {
        setError(err?.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center py-8 pb-8 overflow-x-hidden">
      <div className="w-full px-4 sm:px-6 flex justify-center min-w-0">
        <div className="w-full max-w-2xl min-w-0">
          <Link href="/" className="flex justify-center mb-6 px-2 min-w-0">
            <Image
              src="/TradeHub -Horizontal-Main.svg"
              alt="TradeHub"
              width={180}
              height={40}
              className="h-8 sm:h-10 w-auto max-w-full"
            />
          </Link>

          <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 break-words px-2">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 break-words px-2">
            Already have an account?{' '}
            <Link
              href={`/login${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>

          <p className="text-sm text-emerald-600 text-center mt-2 mb-6">
            Free to join — no credit card, no obligation
          </p>

          <div className="px-1 sm:px-2 min-w-0 overflow-hidden mb-6">
            <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-0 flex-wrap">
              {[...Array(totalSteps)].map((_, i) => (
                <div key={i} className="flex items-center flex-shrink-0">
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                      i + 1 < step
                        ? 'bg-green-600 text-white'
                        : i + 1 === step
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1 < step ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={`w-3 sm:w-6 h-0.5 flex-shrink-0 ${i + 1 < step ? 'bg-green-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-3 text-xs sm:text-sm text-slate-600">
              Step {step} of {totalSteps}
            </div>
          </div>

          <div className="w-full bg-white p-6 sm:p-8 shadow-sm rounded-2xl border border-slate-200 min-w-0 overflow-hidden">
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
              <div className="space-y-6 min-w-0">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Choose your account type</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    This just helps tailor your onboarding. You can change it later.
                  </p>
                </div>
                <div className="h-px bg-slate-200 my-4" />
                <div className="flex rounded-xl border border-slate-200 overflow-hidden [&>button]:flex-1 [&>button]:py-3 [&>button]:text-sm [&>button]:font-medium [&>button]:transition-colors">
                  <button
                    type="button"
                    onClick={() => setAccountType('contractor')}
                    className={
                      accountType === 'contractor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }
                  >
                    Contractor
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('subcontractor')}
                    className={
                      accountType === 'subcontractor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }
                  >
                    Subcontractor
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('supplier')}
                    className={
                      accountType === 'supplier'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }
                  >
                    Supplier
                  </button>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                  {accountType === 'contractor' &&
                    'Contractors manage projects and hire subcontractors or suppliers when needed.'}
                  {accountType === 'subcontractor' &&
                    'Subcontractors provide skilled services and work on projects for contractors.'}
                  {accountType === 'supplier' &&
                    'Suppliers provide materials and equipment to contractors and subcontractors.'}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 min-w-0">
                <SectionHeader
                  icon={User}
                  title="Account setup"
                  subtitle="Create your login credentials to get started."
                />
                <div className="h-px bg-slate-200 my-4" />
                <div className="min-w-0">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1 w-full"
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1 w-full"
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pr-11 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-r-md"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 break-words">Must be at least 6 characters long</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <SectionHeader
                  icon={Wrench}
                  title="Select your trade(s)"
                  subtitle="Choose the trade(s) you work in. Free: 1 trade. Premium: up to 5."
                />
                <div className="h-px bg-slate-200 my-4" />
                <TradeMultiSelect
                  value={tradeCategories}
                  onChange={setTradeCategories}
                  isPremium={isPremium}
                  error={
                    error === 'Please select at least one trade.' ? 'Please select at least one trade.' : undefined
                  }
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <SectionHeader
                  icon={Building2}
                  title="Business details"
                  subtitle="You can list availability and apply for work now. ABN verification is only needed for posting jobs and applying for tenders."
                />
                <div className="h-px bg-slate-200 my-4" />
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
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3 mb-6">
                  <Label htmlFor="businessSearch">Find your business</Label>
                  <div className="flex gap-2">
                    <Input
                      id="businessSearch"
                      type="text"
                      value={businessSearch}
                      onChange={(e) => setBusinessSearch(e.target.value)}
                      placeholder="Search your business name…"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline">
                      Search
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    This is optional. You can manually enter your business details.
                  </p>
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
                  <p className="text-xs text-slate-500 mt-1">Required to post jobs and apply for tenders</p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <SectionHeader
                  icon={MapPin}
                  title="Set your location"
                  subtitle="Tell us where you operate to help match you with local work opportunities."
                />
                <div className="h-px bg-slate-200 my-4" />
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
                  <p className="text-xs text-slate-500 mt-2">
                    Premium lets you expand your work radius to find more jobs and apply for more tenders.
                  </p>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <SectionHeader
                  icon={CalendarDays}
                  title="Set your availability"
                  subtitle="Let others know when you are typically available for work. You can change this anytime from your profile."
                />
                <div className="h-px bg-slate-200 my-4" />
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center gap-3">
                      <Checkbox
                        id={day}
                        checked={availability[day]}
                        onCheckedChange={(checked) =>
                          setAvailability((prev) => ({ ...prev, [day]: checked as boolean }))
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

            {step === 7 && (
              <div className="space-y-6 min-w-0">
                <SectionHeader
                  icon={ShieldCheck}
                  title="Review and confirm"
                  subtitle="Check your details before creating your account."
                />
                <div className="h-px bg-slate-200 my-4" />
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 space-y-3 text-sm min-w-0 overflow-hidden">
                  <div className="min-w-0 break-words">
                    <div className="font-medium text-slate-900">Name</div>
                    <div className="text-slate-600 break-words">{name}</div>
                  </div>
                  <div className="min-w-0 break-words">
                    <div className="font-medium text-slate-900">Email</div>
                    <div className="text-slate-600 break-words">{email}</div>
                  </div>
                  <div className="min-w-0 break-words">
                    <div className="font-medium text-slate-900">Trade(s)</div>
                    <div className="text-slate-600 break-words">
                      {tradeCategories.length > 0 ? tradeCategories.join(', ') : '—'}
                    </div>
                  </div>
                  {businessName && (
                    <div className="min-w-0 break-words">
                      <div className="font-medium text-slate-900">Business Name</div>
                      <div className="text-slate-600 break-words">{businessName}</div>
                    </div>
                  )}
                  {abn && (
                    <div className="min-w-0 break-words">
                      <div className="font-medium text-slate-900">ABN</div>
                      <div className="text-slate-600 break-words">{abn}</div>
                    </div>
                  )}
                  {location && (
                    <div className="min-w-0 break-words">
                      <div className="font-medium text-slate-900">Location</div>
                      <div className="text-slate-600 break-words">
                        {location}
                        {postcode ? `, ${postcode}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 mt-8 min-w-0">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1 min-w-0 text-sm sm:text-base">
                  <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Back</span>
                </Button>
              )}

              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 min-w-0 text-sm sm:text-base"
                  disabled={error === 'DUPLICATE_EMAIL'}
                >
                  <span className="truncate">Continue</span>
                  <ChevronRight className="w-4 h-4 ml-1 sm:ml-2 flex-shrink-0" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSignup} disabled={loading} className="flex-1 min-w-0 text-sm sm:text-base">
                  <span className="truncate">{loading ? 'Creating account...' : 'Create Account'}</span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs sm:text-sm text-slate-600 break-words px-2">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline break-words">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline break-words">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
