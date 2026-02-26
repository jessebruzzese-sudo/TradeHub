'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  Calendar,
  Shield,
  Info,
  Crown,
  ArrowLeft,
  TestTube,
  RotateCcw,
  User,
  Building2,
  BadgeCheck,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
} from 'lucide-react';

import { getTradeIcon } from '@/lib/trade-icons';

import { AppLayout } from '@/components/app-nav';
import { ReliabilityReviewCard } from '@/components/reliability-review-card';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileCover } from '@/components/profile-cover';
import { ProBadge } from '@/components/pro-badge';
import { PricingBlueWrapper } from '@/components/marketing/PricingBlueWrapper';
import { VerifiedBadge } from '@/components/verified-badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getStore } from '@/lib/store';
import { buildLoginUrl } from '@/lib/url-utils';
import { shouldShowProBadge } from '@/lib/subscription-utils';
import { BILLING_SIM_ALLOWED, getSimulatedPremium, clearSimulatedPremium } from '@/lib/billing-sim';
import { useSimulatedPremium } from '@/lib/use-simulated-premium';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

export default function ProfilePage() {
  const { session, currentUser, updateUser } = useAuth();
  const router = useRouter();
  const store = useMemo(() => getStore(), []);

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/');
    }
  }, [currentUser, router]);
  const [isSimulated, setSimulated] = useSimulatedPremium();
  const [portalLoading, setPortalLoading] = useState(false);

  // If not authed, show a simple login prompt
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold text-gray-900">Please log in</h1>
        <p className="mt-2 text-sm text-gray-600">You need to be signed in to view your profile.</p>
        <Link href={buildLoginUrl('/profile')} className="mt-4 inline-block">
          <Button>Go to login</Button>
        </Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  const reviews = store.getReviewsByRecipient(currentUser.id);
  const reliabilityReviews = reviews.filter((r: any) => r.isReliabilityReview);
  const standardReviews = reviews.filter((r: any) => !r.isReliabilityReview);

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    store.updateUser(currentUser.id, {
      avatar: `${newAvatarUrl}?v=${Date.now()}`,
    });
  };

  const dashboardPath = isAdmin(currentUser) ? '/admin' : '/dashboard';

  const userForDiscovery = {
    is_premium: currentUser.isPremium ?? undefined,
    subscription_status: currentUser.subscriptionStatus,
    subcontractor_sub_status: undefined,
    active_plan: currentUser.activePlan,
    subcontractor_plan: undefined,
  };
  const isPremiumForDiscoveryCheck = isPremiumForDiscovery(userForDiscovery);
  const showUpgradeNudge = !isPremiumForDiscoveryCheck && !isAdmin(currentUser);

  const showBillingSimulation = BILLING_SIM_ALLOWED;
  const isUsingSimulation = showBillingSimulation && getSimulatedPremium();
  const hasRealPremium = shouldShowProBadge(currentUser);

  const planStatus = (() => {
    if (isUsingSimulation && !hasRealPremium) return 'Premium (Simulated)';
    if (hasRealPremium) return 'Pro Plan';
    return 'Free Plan';
  })();

  const handleResetSimulation = () => {
    clearSimulatedPremium();
    setSimulated(false);
    window.location.reload();
  };

  const toUrl = (platform: string, raw: string) => {
    const v = (raw || '').trim();
    if (!v) return null;

    // Already a URL (or protocol-relative)
    if (/^https?:\/\//i.test(v) || /^\/\//.test(v)) return v;

    const handle = v.replace(/^@/, '');

    switch (platform) {
      case 'website':
        return `https://${handle.replace(/^https?:\/\//i, '')}`;
      case 'instagram':
        return `https://instagram.com/${handle}`;
      case 'facebook':
        return `https://facebook.com/${handle}`;
      case 'linkedin':
        return handle.startsWith('in/') || handle.startsWith('company/')
          ? `https://linkedin.com/${handle}`
          : `https://linkedin.com/in/${handle}`;
      case 'tiktok':
        return `https://tiktok.com/@${handle}`;
      case 'youtube':
        if (
          handle.startsWith('@') ||
          handle.startsWith('channel/') ||
          handle.startsWith('c/') ||
          handle.startsWith('user/')
        ) {
          return `https://youtube.com/${handle}`;
        }
        return `https://youtube.com/@${handle}`;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <PricingBlueWrapper className="bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
        <div className="mx-auto max-w-5xl px-4 py-10 text-white">
          <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <Link href={dashboardPath}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="text-slate-900">
        {/* LinkedIn-style Header (cover + overlapping avatar inside one card) */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* Cover */}
          <div className="relative">
            <ProfileCover
              userId={currentUser.id}
              coverUrl={currentUser.coverUrl ?? undefined}
              onCoverUpdate={async (url) => {
                await updateUser({ coverUrl: url });
              }}
            />

            {/* Avatar overlaps cover (like LinkedIn) */}
            <div className="absolute left-6 -bottom-14 z-10">
              <div className="rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200">
                <ProfileAvatar
                  userId={currentUser.id}
                  currentAvatarUrl={currentUser.avatar ?? undefined}
                  userName={currentUser.name || 'TradeHub user'}
                  onAvatarUpdate={handleAvatarUpdate}
                  size={120}
                />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-14">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {(() => {
                  const abnStatusNorm = String(
                    (currentUser as any)?.abn_status ?? (currentUser as any)?.abnStatus ?? ''
                  ).toUpperCase();
                  const isVerified = abnStatusNorm === 'VERIFIED';

                  const displayName =
                    (currentUser?.name || (currentUser as any)?.full_name || '').trim() ||
                    (currentUser?.email ? currentUser.email.split('@')[0] : 'Profile');

                  const businessName =
                    (currentUser?.showBusinessNameOnProfile === true || (currentUser as any)?.show_business_name_on_profile === true)
                      ? ((currentUser?.businessName ?? (currentUser as any)?.business_name) || '').trim()
                      : '';

                  const abnToShow =
                    (currentUser?.showAbnOnProfile === true || (currentUser as any)?.show_abn_on_profile === true)
                      ? ((currentUser?.abn ?? (currentUser as any)?.abn) || '').trim()
                      : '';

                  return (
                    <>
                      {/* Name + Verified (tight, enterprise clean) */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                          {displayName}
                        </h1>

                        {/* Verified badge sits tight + slightly smaller */}
                        {isVerified ? (
                          <div className="mt-0.5 scale-[0.95] origin-left">
                            <VerifiedBadge />
                          </div>
                        ) : (
                          <Link
                            href="/verify-business"
                            className="inline-flex items-center gap-2 rounded-full border border-dashed border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-blue-300 bg-white text-[10px] font-bold text-blue-700">
                              ✓
                            </span>
                            Add verification badge
                          </Link>
                        )}

                        {shouldShowProBadge(currentUser) && <ProBadge size="md" />}
                      </div>

                      {((currentUser as any)?.mini_bio ?? (currentUser as any)?.miniBio) ? (
                        <div className="mt-2 text-sm md:text-base text-slate-600 leading-snug">
                          {(currentUser as any).mini_bio ?? (currentUser as any).miniBio}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {/* Business Name (only if toggled + value exists) */}
                        {businessName ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm">
                            <Building2 className="h-4 w-4 text-slate-600" />
                            <span>{businessName}</span>
                          </div>
                        ) : null}

                        {/* ABN (only if toggled + value exists) */}
                        {abnToShow ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm">
                            <BadgeCheck className="h-4 w-4 text-emerald-700" />
                            <span>ABN: {abnToShow}</span>
                          </div>
                        ) : null}

                        {/* Mobile (only if toggled + value exists) */}
                        {((currentUser as any)?.show_phone_on_profile === true ||
                          (currentUser as any)?.showPhoneOnProfile === true) &&
                        String((currentUser as any)?.phone ?? (currentUser as any)?.mobile ?? '')
                          .trim() ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-50">
                              <span className="text-[13px] leading-none text-slate-600">📞</span>
                            </span>
                            <span>
                              {String(
                                (currentUser as any)?.phone ?? (currentUser as any)?.mobile
                              ).trim()}
                            </span>
                          </div>
                        ) : null}

                        {/* Email (only if toggled) */}
                        {((currentUser as any)?.show_email_on_profile === true ||
                          (currentUser as any)?.showEmailOnProfile === true) &&
                        currentUser?.email ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                            <Mail className="h-4 w-4 text-slate-500" />
                            <span>{currentUser.email}</span>
                          </div>
                        ) : null}
                      </div>

                      {currentUser.primaryTrade
                        ? (() => {
                            const Icon = getTradeIcon(currentUser.primaryTrade);

                            return (
                              <div className="mt-4 flex items-center gap-2 text-lg md:text-xl font-semibold text-slate-800 tracking-tight">
                                <Icon className="h-5 w-5 text-blue-600" />
                                <span>{currentUser.primaryTrade}</span>
                              </div>
                            );
                          })()
                        : null}
                    </>
                  );
                })()}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link href="/profile/edit">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl px-4 text-sm font-semibold shadow-sm hover:shadow-md transition"
                  >
                    Edit profile
                  </Button>
                </Link>
              </div>
            </div>

            <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Stats row (same as before) */}
            <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-yellow-50/60 p-4 shadow-sm">
              <div className="relative">
                <div className="absolute -inset-2 rounded-2xl bg-yellow-400/20 blur-xl" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-200 to-white ring-1 ring-yellow-200 shadow-[0_10px_25px_rgba(250,204,21,0.35)]">
                  <Star className="h-6 w-6 text-yellow-700" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {currentUser.rating}
                  </div>
                  <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    rating
                  </div>
                </div>

              </div>
            </div>

            {!!currentUser.reliabilityRating && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{currentUser.reliabilityRating}</div>
                  <div className="text-sm text-gray-600">Reliability</div>
                </div>
              </div>
            )}
          </div>

            {/* Links Section */}
            {(() => {
              const links = ((currentUser as any)?.links ?? {}) as Record<string, any>;
              const u = currentUser as any;

              const normalizedLinks = {
                website: links.website ?? links.Website ?? u?.website ?? null,
                instagram: links.instagram ?? links.Instagram ?? u?.instagram ?? null,
                facebook: links.facebook ?? links.Facebook ?? u?.facebook ?? null,
                linkedin: links.linkedin ?? links.linkedIn ?? links.LinkedIn ?? u?.linkedin ?? null,
                tiktok: links.tiktok ?? links.TikTok ?? u?.tiktok ?? null,
                youtube: links.youtube ?? links.YouTube ?? u?.youtube ?? null,
              };

              const socials = [
                { key: 'website', label: 'Website', Icon: Globe },
                { key: 'instagram', label: 'Instagram', Icon: Instagram },
                { key: 'facebook', label: 'Facebook', Icon: Facebook },
                { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
                { key: 'youtube', label: 'YouTube', Icon: Youtube },
              ] as const;

              const hasAny =
                socials.some(({ key }) => (normalizedLinks as any)?.[key]) ||
                (normalizedLinks as any)?.tiktok;

              if (!hasAny) return null;

              return (
                <div className="mt-6">
                  {/* Divider */}
                  <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-slate-300/60 to-transparent" />

                  {/* Section Title */}
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Links
                  </div>

                  {/* Icons Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {socials.map(({ key, label, Icon }) => {
                      const raw = (normalizedLinks as any)?.[key] as string | undefined;
                      if (!raw) return null;

                      const href = toUrl(key, raw);
                      if (!href) return null;

                      return (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={label}
                          title={label}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      );
                    })}

                    {(normalizedLinks as any)?.tiktok
                      ? (() => {
                          const href = toUrl('tiktok', (normalizedLinks as any).tiktok);
                          if (!href) return null;
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="TikTok"
                              title="TikTok"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                                <path d="M21 8.5c-1.8.1-3.5-.5-4.8-1.6-1.2-1-2-2.5-2.2-4.1h-3.7v13.2c0 1.5-1.2 2.7-2.7 2.7S5 17.5 5 16s1.2-2.7 2.7-2.7c.3 0 .6 0 .9.1V9.7c-.3 0-.6-.1-.9-.1C4.6 9.6 2 12.2 2 15.4S4.6 21.2 7.7 21.2s5.7-2.6 5.7-5.8V10.5c1.7 1.2 3.8 1.9 6 1.8V8.5z" />
                              </svg>
                            </a>
                          );
                        })()
                      : null}
                  </div>
                </div>
              );
            })()}

            {/* About dropdown */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <details className="group">
                <summary className="group flex w-full cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
                      <User className="relative h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">Bio</div>
                        <span className="inline-flex items-center rounded-full bg-blue-600/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {currentUser.bio ? 'Tap to read' : 'Add bio'}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-600">
                        {currentUser.bio
                          ? (currentUser.bio.length > 88 ? `${currentUser.bio.slice(0, 88)}…` : currentUser.bio)
                          : 'Tell people who you are and what you do.'}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      {currentUser.bio ? 'Read bio →' : 'Add →'}
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform group-open:rotate-180">
                      ⌄
                    </span>
                  </div>
                </summary>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  <p className="text-slate-700 leading-relaxed text-[15px] md:text-base">
                    {currentUser.bio || 'No bio yet.'}
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Upgrade nudge for free users */}
        {showUpgradeNudge && (
          <div className="mb-6 relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-5 shadow-sm">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-orange-200/30 blur-2xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Want to appear in more searches?
                </p>
                <p className="mt-1 text-xs text-amber-900/80">
                  You&apos;re currently visible within 20km. Upgrade to Premium to increase your discovery radius up to 100km.
                </p>
              </div>

              <Link href="/pricing" className="shrink-0">
                <Button
                  className="
                    group
                    relative
                    rounded-xl
                    px-5 py-2.5
                    font-semibold
                    text-black
                    bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500
                    shadow-lg shadow-amber-500/40
                    transition-all duration-200
                    hover:shadow-xl hover:shadow-amber-500/60
                    hover:-translate-y-0.5
                    hover:scale-[1.03]
                    active:scale-[0.98]
                  "
                >
                  <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  View Premium
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Subscription */}
        {/* Role used for UI/copy only, not permissions */}
        {currentUser.role === 'subcontractor' ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Subscription Plan</h3>
              </div>
              {!MVP_FREE_MODE && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    View Plans
                  </Button>
                </Link>
              )}
            </div>

            <div
              className={`flex items-center justify-between rounded-lg p-4 ${
                isUsingSimulation && !hasRealPremium
                  ? 'border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100'
                  : 'border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'
              }`}
            >
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{planStatus}</span>
                  {hasRealPremium && <ProBadge size="sm" />}
                  {isUsingSimulation && !hasRealPremium && (
                    <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                      SIMULATION
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {isUsingSimulation && !hasRealPremium
                    ? 'Testing Premium features (not a real subscription)'
                    : hasRealPremium
                    ? 'Expanded reach, alerts, and tools'
                    : 'Basic access to jobs in your area'}
                </p>
              </div>

              <div className="text-right">
                <div
                  className={`text-2xl font-bold ${
                    isUsingSimulation && !hasRealPremium ? 'text-amber-600' : 'text-blue-600'
                  }`}
                >
                  ${hasRealPremium ? '10' : '0'}
                </div>
                <div className="text-xs text-gray-500">/month</div>
              </div>
            </div>

            {!MVP_FREE_MODE && (
              <div className="mt-4">
                {hasRealPremium ? (
                  <Button
                    className="w-full"
                    disabled={portalLoading}
                    onClick={async () => {
                      setPortalLoading(true);
                      try {
                        const res = await fetch('/api/billing/portal', { method: 'POST' });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data?.url) {
                          window.location.href = data.url;
                          return;
                        }
                        alert(data?.error || 'Could not open billing portal');
                      } finally {
                        setPortalLoading(false);
                      }
                    }}
                  >
                    {portalLoading ? 'Loading…' : 'Manage Subscription'}
                  </Button>
                ) : (
                  <Link href="/pricing">
                    <Button className="w-full">Upgrade to Pro</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Billing simulation */}
        {showBillingSimulation ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <TestTube className="h-5 w-5 text-amber-700" />
              <h3 className="font-semibold text-gray-900">Billing Simulation (Testing Only)</h3>
            </div>

            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-4">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                This is for testing Premium features locally. Does not charge money. Not real billing.
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex-1">
                  <div className="mb-1 font-medium text-gray-900">Simulate Premium</div>
                  <p className="text-sm text-gray-600">Test Premium UI gates and features without real subscription</p>
                </div>

                <Switch checked={isSimulated} onCheckedChange={setSimulated} aria-label="Toggle Premium simulation" />
              </div>

              {isSimulated ? (
                <Button variant="outline" size="sm" onClick={handleResetSimulation} className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Simulation
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Reviews */}
        {reviews.length ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Reviews ({reviews.length})</h3>
            <div className="space-y-4">
              {reliabilityReviews.map((review: any) => {
                const author = store.getUserById(review.authorId);
                if (!author) return null;
                return <ReliabilityReviewCard key={review.id} review={review} author={author} />;
              })}

              {standardReviews.map((review: any) => {
                const author = store.getUserById(review.authorId);
                if (!author) return null;
                return <ReliabilityReviewCard key={review.id} review={review} author={author} />;
              })}
            </div>
          </div>
        ) : null}
        </div>
      </div>
      </PricingBlueWrapper>
    </AppLayout>
  );
}
