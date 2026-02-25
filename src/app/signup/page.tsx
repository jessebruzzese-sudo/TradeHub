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
import { TradeMultiSelect } from '@/components/trade-multiselect';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  User,
  Building2,
  Wrench,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

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

async function persistAbnVerification(params: {
  abn: string;
  entityName?: string | null;
  verified: boolean;
}) {
  const supabase = getBrowserSupabase();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) throw new Error('NOT_AUTHENTICATED');

  const userId = userRes.user.id;
  const nowIso = new Date().toISOString();

  if (params.verified) {
    const { error } = await supabase
      .from('users')
      .update({
        abn: params.abn,
        abn_status: 'VERIFIED',
        abn_verified_at: nowIso,
        business_name: params.entityName ?? null,
      })
      .eq('id', userId);

    if (error) {
      console.error('[abn] persist verified failed', error);
      throw new Error('PERSIST_FAILED');
    }
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      abn: params.abn,
      abn_status: 'UNVERIFIED',
      abn_verified_at: null,
    })
    .eq('id', userId);

  if (error) {
    console.error('[abn] persist unverified failed', error);
    throw new Error('PERSIST_FAILED');
  }
}

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
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [abnVerifying, setAbnVerifying] = useState(false);
  const [abnVerified, setAbnVerified] = useState(false);
  const [abnEntityName, setAbnEntityName] = useState<string | null>(null);
  const [abnEntityType, setAbnEntityType] = useState<string | null>(null);
  const [abnError, setAbnError] = useState<string | null>(null);

  const TOTAL_STEPS = 5;
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
  const step6Valid = formValid;

  const { signup, currentUser } = useAuth();

  const verifyAbnNow = async () => {
    const clean = (abn || '').replace(/\s/g, '');

    setAbnError(null);

    if (!/^\d{11}$/.test(clean)) {
      setAbnError('Enter a valid 11-digit ABN');
      return;
    }

    try {
      setAbnVerifying(true);

      const res = await fetch('/api/abn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abn: clean }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAbnError(data?.error || 'ABN verification failed');
        persistAbnVerification({
          abn: clean,
          entityName: null,
          verified: false,
        }).catch(() => {});
        return;
      }

      if (currentUser?.id) {
        try {
          await persistAbnVerification({
            abn: data.abn ?? clean,
            entityName: data.entityName ?? null,
            verified: true,
          });
        } catch (e) {
          toast.error('ABN verified, but could not save verification. Please try again.');
          return;
        }
        router.refresh();
      }

      setAbnVerified(true);
      setAbnEntityName(data.entityName ?? null);
      setAbnEntityType(data.entityType ?? null);

      if (!businessName?.trim() && data.entityName) {
        setBusinessName(data.entityName);
      }
    } catch (e) {
      console.error(e);
      setAbnError('ABN verification failed');
    } finally {
      setAbnVerifying(false);
    }
  };
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
      const normalizedTrades = primaryTrade ? [primaryTrade] : [];

      await signup(visibleName?.trim() || '', email, password, primaryTrade ?? '', {
        businessName,
        abn,
        abnEntityName: abnVerified ? abnEntityName ?? undefined : undefined,
        abnEntityType: abnVerified ? abnEntityType ?? undefined : undefined,
        abnVerified: abnVerified ? true : undefined,
        location,
        postcode,
        availability: {},
        tradeCategories,
        trades: normalizedTrades,
        legal_name: fullName,
      });

      const supabase = getBrowserSupabase();
      const { data: authed } = await supabase.auth.getUser();

      if (authed?.user?.id && normalizedTrades.length > 0) {
        await supabase
          .from('users')
          .update({ trades: normalizedTrades })
          .eq('id', authed.user.id);
      }

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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                    onChange={(e) => {
                      setAbn(e.target.value);
                      setAbnError(null);
                    }}
                    placeholder="12 345 678 901"
                    className="mt-1"
                    disabled={abnVerified}
                  />
                  <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-blue-700">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 mt-[2px] fill-blue-600 shrink-0"
                    >
                      <path d="M12 2l2.1 2.1 3-.3-.3 3L19 9l3 3-3 3 .3 3-3-.3L12 22l-2.1-2.1-3 .3.3-3L5 15l-3-3 3-3-.3-3 3 .3L12 2z"/>
                    </svg>
                    <span>Required to post jobs and apply for tenders</span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={abnVerifying || abnVerified || !(abn || '').replace(/\s/g, '')}
                      onClick={verifyAbnNow}
                      className={`
                        inline-flex items-center gap-2 rounded-xl px-5 py-2.5
                        font-semibold text-white
                        transition-all duration-200
                        shadow-lg
                        ${abnVerified
                          ? 'bg-emerald-600 shadow-emerald-900/30 cursor-default'
                          : abnVerifying
                            ? 'bg-blue-500 opacity-80 cursor-wait'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:-translate-y-[1px] shadow-blue-900/30'
                        }
                      `}
                    >
                      {abnVerified ? (
                        <>
                          <span>Verified</span>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                            <path d="M22 12l-2.1 2.1.3 3-3-.3L15 19l-3 3-2.1-2.1-3 .3.3-3L2 12l2.1-2.1-.3-3 3 .3L9 2l3 3 2.1-2.1 3-.3-.3 3L22 12zm-11 3.5l6-6-1.4-1.4L11 12.7l-2.6-2.6L7 11.5l4 4z" />
                          </svg>
                        </>
                      ) : (
                        <>
                          <span>{abnVerifying ? 'Verifying...' : 'Verify now'}</span>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-90">
                            <path d="M12 2l2.1 2.1 3-.3-.3 3L19 9l3 3-3 3 .3 3-3-.3L12 22l-2.1-2.1-3 .3.3-3L5 15l-3-3 3-3-.3-3 3 .3L12 2zm-1 13l6-6-1.4-1.4L11 11.6 8.4 9 7 10.4 11 15z" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  {abnVerified && abnEntityName && (
                    <div className="mt-2 text-sm text-emerald-600 flex items-center gap-2">
                      <span>✅</span>
                      <span>
                        {abnEntityName}
                        {abnEntityType ? ` • ${abnEntityType}` : ''}
                      </span>
                    </div>
                  )}

                  {abnError && (
                    <div className="mt-2 text-sm text-red-600">{abnError}</div>
                  )}
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
