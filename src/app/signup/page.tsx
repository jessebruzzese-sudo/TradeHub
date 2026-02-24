'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
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
  AlertCircle,
  Check,
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

const stepAccent = (n: number) => {
  switch (n) {
    case 1:
      return {
        pill: 'bg-blue-600/15 text-blue-100 border-blue-300/25',
        iconBg: 'bg-blue-600/15 border-blue-300/25',
        icon: 'text-blue-100',
      };
    case 2:
      return {
        pill: 'bg-indigo-600/15 text-indigo-100 border-indigo-300/25',
        iconBg: 'bg-indigo-600/15 border-indigo-300/25',
        icon: 'text-indigo-100',
      };
    case 3:
      return {
        pill: 'bg-sky-600/15 text-sky-100 border-sky-300/25',
        iconBg: 'bg-sky-600/15 border-sky-300/25',
        icon: 'text-sky-100',
      };
    case 4:
      return {
        pill: 'bg-teal-600/15 text-teal-100 border-teal-300/25',
        iconBg: 'bg-teal-600/15 border-teal-300/25',
        icon: 'text-teal-100',
      };
    case 5:
      return {
        pill: 'bg-violet-600/15 text-violet-100 border-violet-300/25',
        iconBg: 'bg-violet-600/15 border-violet-300/25',
        icon: 'text-violet-100',
      };
    case 6:
      return {
        pill: 'bg-amber-600/15 text-amber-100 border-amber-300/25',
        iconBg: 'bg-amber-600/15 border-amber-300/25',
        icon: 'text-amber-100',
      };
    default:
      return {
        pill: 'bg-white/15 text-white/80 border-white/20',
        iconBg: 'bg-white/15 border-white/20',
        icon: 'text-white/90',
      };
  }
};

function CollapsibleSection({
  number,
  title,
  subtitle,
  icon: Icon,
  enabled,
  open,
  completed,
  onToggle,
  cardClassName,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  open: boolean;
  completed?: boolean;
  onToggle: () => void;
  cardClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cardClassName}>
      <button
        type="button"
        onClick={() => enabled && onToggle()}
        className={`flex items-center justify-between px-5 py-4 border-b border-black/10 bg-white w-full text-left ${
          enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
        }`}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div
              className={
                enabled
                  ? 'flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600'
                  : 'flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-500'
              }
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span
                className={
                  enabled
                    ? 'px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700'
                    : 'px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500'
                }
              >
                Step {number}
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
                {title}
              </h3>
            </div>
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {completed && (
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-100 border border-emerald-200">
              <Check className="h-4 w-4 text-emerald-700" />
            </div>
          )}
          {!enabled && <span className="text-xs text-slate-400">Locked</span>}
          <div className="text-slate-400">{open ? '▾' : '▸'}</div>
        </div>
      </button>

      {open && enabled ? (
        <div className="px-5 py-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function SignupPage() {
  const [openSection, setOpenSection] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);

  const stepCardClass = (step: number) =>
    `relative overflow-hidden rounded-2xl bg-white transition-all duration-300 transform
   ${currentStep === step
     ? 'shadow-2xl -translate-y-1 border border-blue-500/40 ring-4 ring-blue-500/10'
     : 'shadow-md border border-black/10'}`;

  useEffect(() => {
    setCurrentStep(openSection >= 1 ? openSection : 1);
  }, [openSection]);

  const [fullName, setFullName] = useState('');
  const [visibleName, setVisibleName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tradeCategories, setTradeCategories] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const TOTAL_STEPS = 6;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const markStepDone = (n: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(n);
      return next;
    });
  };

  const isStepDone = (n: number) => completedSteps.has(n);
  const completedCount = completedSteps.size;
  const progressPct = Math.round((completedCount / TOTAL_STEPS) * 100);

  // Step 1 validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const minLen = password.length >= 8;
  const passwordValid = hasLetter && hasNumber && minLen;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const step1Valid =
    fullName.trim().length > 1 &&
    visibleName.trim().length > 1 &&
    emailValid &&
    passwordValid &&
    passwordsMatch;
  const step2Valid = tradeCategories.length > 0;
  const step3Valid = true; // no required fields on step 3
  const step3HasValues =
    (businessName?.trim?.() ?? '') !== '' || (abn?.trim?.() ?? '') !== '';
  const step3CanDone = (businessName?.trim?.() ?? '') !== '';
  const step4Valid = location.trim().length > 0 && postcode.trim().length > 0;
  const formValid =
    step1Valid &&
    tradeCategories.length > 0 &&
    location.trim().length > 0 &&
    postcode.trim().length > 0;
  const step5Valid = Object.values(availability).some(Boolean);
  const step6Valid = formValid;

  useEffect(() => {
    if (!visibleName && fullName) {
      setVisibleName(fullName);
    }
  }, [fullName, visibleName]);


  const { signup, currentUser } = useAuth();
  // TODO: Map to real field if different (e.g. subscription_tier vs active_plan/is_premium)
  const isPremium = currentUser?.isPremium === true;
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');

  const handleCreateAccount = () => {
    setError('');
    if (!formValid) {
      if (!step1Valid) {
        setError('Please complete your account details.');
        setOpenSection(1);
        return;
      }
      if (tradeCategories.length === 0) {
        setError('Please select at least one trade.');
        setOpenSection(2);
        return;
      }
      if (!location.trim() || !postcode.trim()) {
        setError('Please set your business location.');
        setOpenSection(4);
        return;
      }
      return;
    }
    markStepDone(6);
    handleSignup();
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      // Backward compat: backend expects primary_trade (single). TODO: migrate fully to trade_categories.
      const primaryTrade = tradeCategories[0] ?? null;
      await signup(visibleName, email, password, primaryTrade, {
        businessName,
        abn,
        location,
        postcode,
        availability,
        tradeCategories,
        legal_name: fullName,
      });

      router.push('/profile/edit');
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
    <div className="relative min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
      {/* Dotted overlay - behind watermark */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden
      />

      {/* Watermark (fixed to viewport) - above background, behind content */}
      <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
        <img
          src="/TradeHub-Mark-whiteout.svg"
          alt=""
          aria-hidden="true"
          className="h-[1600px] w-[1600px] opacity-[0.08]"
        />
      </div>

      {/* Signup content */}
      <div className="relative z-10 min-h-screen w-full flex flex-col justify-center py-8 pb-8 overflow-x-hidden">
        <div className="w-full px-4 sm:px-6 flex justify-center min-w-0">
          <div className="w-full max-w-2xl min-w-0">
            <Link href="/" className="flex justify-center mb-6 px-2 min-w-0">
              <Image
                src="/tradehub-logo-white.svg"
                alt="TradeHub"
                width={120}
                height={120}
                className="mx-auto h-[52px] w-auto md:h-28 lg:h-32"
                priority
              />
            </Link>

            <h2 className="text-center text-2xl sm:text-3xl font-bold text-white break-words px-2">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-blue-100 break-words px-2">
              Already have an account?{' '}
              <Link
                href={`/login${returnUrlParam ? `?returnUrl=${encodeURIComponent(returnUrlParam)}` : ''}`}
                className="font-medium text-white hover:text-blue-100"
              >
                Sign in
              </Link>
            </p>

            <p className="text-sm text-blue-100 text-center mt-2">
              Free to join — no credit card, no obligation
            </p>

            <div className="mx-auto mt-4 max-w-2xl">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white/70 transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 text-center text-xs text-white/80">
                {progressPct}% complete
              </div>
            </div>

          <div className="w-full p-6 sm:p-8 min-w-0 overflow-hidden space-y-4 mt-6">
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

            <CollapsibleSection
              number={1}
              icon={User}
              title="Account setup"
              subtitle="Create your login credentials to get started."
              enabled={true}
              open={openSection === 1}
              completed={isStepDone(1)}
              onToggle={() => setOpenSection(openSection === 1 ? 0 : 1)}
              cardClassName={stepCardClass(1)}
            >
              <div className="space-y-6 min-w-0">
                <div className="min-w-0">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1 w-full"
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="visibleName">Profile name or business name *</Label>
                  <Input
                    id="visibleName"
                    type="text"
                    value={visibleName}
                    onChange={(e) => setVisibleName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1 w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This is the name shown on your public profile
                  </p>
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
                      placeholder="At least 8 characters, letters and numbers"
                      className="pr-12 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <p className={`text-xs mt-1 break-words ${!minLen ? 'text-amber-600' : !hasLetter || !hasNumber ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {!minLen
                        ? 'Password must be at least 8 characters'
                        : !hasLetter || !hasNumber
                        ? 'Password must include letters and numbers'
                        : 'Password meets requirements'}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="pr-12 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-amber-600 mt-1 break-words">Passwords do not match</p>
                  )}
                </div>
                {!step1Valid && (
                  <p className="mt-3 text-sm text-red-600">
                    Please complete all required fields correctly to continue.
                  </p>
                )}
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    disabled={!step1Valid}
                    onClick={() => {
                      if (!step1Valid) return;
                      markStepDone(1);
                      setMaxUnlockedStep((s) => Math.max(s, 2));
                      setOpenSection(2);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              number={2}
              icon={Wrench}
              title="Select your trade(s)"
              subtitle="Choose the trade(s) you work in. Free: 1 trade. Premium: up to 5."
              enabled={maxUnlockedStep >= 2}
              open={openSection === 2}
              completed={isStepDone(2)}
              onToggle={() => setOpenSection(openSection === 2 ? 0 : 2)}
              cardClassName={stepCardClass(2)}
            >
              <div className="space-y-6">
                <TradeMultiSelect
                  value={tradeCategories}
                  onChange={setTradeCategories}
                  isPremium={isPremium}
                  error={
                    error === 'Please select at least one trade.' ? 'Please select at least one trade.' : undefined
                  }
                />
                {!step2Valid && (
                  <p className="mt-3 text-sm text-red-600">
                    Please select at least one trade to continue.
                  </p>
                )}
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    disabled={!step2Valid}
                    onClick={() => {
                      if (!step2Valid) return;
                      markStepDone(2);
                      setMaxUnlockedStep((s) => Math.max(s, 3));
                      setOpenSection(3);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              number={3}
              icon={Building2}
              title="Business details"
              subtitle="You can list availability and apply for work now. ABN verification is only needed for posting jobs and applying for tenders."
              enabled={maxUnlockedStep >= 3}
              open={openSection === 3}
              completed={isStepDone(3)}
              onToggle={() => setOpenSection(openSection === 3 ? 0 : 3)}
              cardClassName={stepCardClass(3)}
            >
              <div className="space-y-6">
                <div>
                  <Label htmlFor="businessName">Business Name (Optional)</Label>
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
                  <p className="text-xs text-slate-500 mt-1">
                    Required to post jobs and apply for tenders
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled
                      className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600 opacity-50 cursor-not-allowed"
                    >
                      Verify now
                    </button>
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                      Coming soon
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      markStepDone(3);
                      setMaxUnlockedStep((s) => Math.max(s, 4));
                      setOpenSection(4);
                    }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Skip <span aria-hidden="true">→</span>
                  </button>

                  <Button
                    type="button"
                    disabled={!step3CanDone}
                    onClick={() => {
                      markStepDone(3);
                      setMaxUnlockedStep((s) => Math.max(s, 4));
                      setOpenSection(4);
                    }}
                    className={step3CanDone ? '' : 'opacity-50 cursor-not-allowed'}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              number={4}
              icon={MapPin}
              title="Set your location"
              subtitle="Tell us where you operate to help match you with local work opportunities."
              enabled={maxUnlockedStep >= 4}
              open={openSection === 4}
              completed={isStepDone(4)}
              onToggle={() => setOpenSection(openSection === 4 ? 0 : 4)}
              cardClassName={stepCardClass(4)}
            >
              <div className="space-y-6">
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
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    disabled={!step4Valid}
                    onClick={() => {
                      if (!step4Valid) return;
                      markStepDone(4);
                      setMaxUnlockedStep((s) => Math.max(s, 5));
                      setOpenSection(5);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              number={5}
              icon={CalendarDays}
              title="Set your availability"
              subtitle="Let others know when you are typically available for work. You can change this anytime from your profile."
              enabled={maxUnlockedStep >= 5}
              open={openSection === 5}
              completed={isStepDone(5)}
              onToggle={() => setOpenSection(openSection === 5 ? 0 : 5)}
              cardClassName={stepCardClass(5)}
            >
              <div className="space-y-6">
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
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    disabled={!step5Valid}
                    onClick={() => {
                      if (!step5Valid) return;
                      markStepDone(5);
                      setMaxUnlockedStep((s) => Math.max(s, 6));
                      setOpenSection(6);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              number={6}
              icon={ShieldCheck}
              title="Review and confirm"
              subtitle="Check your details before creating your account."
              enabled={maxUnlockedStep >= 6}
              open={openSection === 6}
              completed={isStepDone(6)}
              onToggle={() => setOpenSection(openSection === 6 ? 0 : 6)}
              cardClassName={stepCardClass(6)}
            >
              <div className="space-y-6 min-w-0">
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 space-y-3 text-sm min-w-0 overflow-hidden">
                  <div className="min-w-0 break-words">
                    <div className="font-medium text-slate-900">Name</div>
                    <div className="text-slate-600 break-words">{visibleName}</div>
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
            </CollapsibleSection>

            <Button
              type="button"
              onClick={handleCreateAccount}
              className="w-full mt-8"
              disabled={!formValid || loading || error === 'DUPLICATE_EMAIL'}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>

          <div className="mt-6 text-center text-xs sm:text-sm text-blue-100 break-words px-2">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-white hover:underline break-words">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-white hover:underline break-words">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
