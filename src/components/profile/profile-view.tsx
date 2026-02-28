'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Shield,
  ThumbsUp,
  ThumbsDown,
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
  Info,
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
import { cn } from '@/lib/utils';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { shouldShowProBadge } from '@/lib/subscription-utils';
import { BILLING_SIM_ALLOWED, getSimulatedPremium, clearSimulatedPremium } from '@/lib/billing-sim';
import { useSimulatedPremium } from '@/lib/use-simulated-premium';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import { useEffect, useMemo, useState } from 'react';

type ProfileViewMode = 'self' | 'public';

export type PublicProfileData = {
  id: string;
  name?: string | null;
  business_name?: string | null;
  avatar?: string | null;
  cover_url?: string | null;
  trades?: string[] | null;
  location?: string | null;
  postcode?: string | null;
  mini_bio?: string | null;
  bio?: string | null;
  rating?: number | null;
  reliability_rating?: number | null;
  completed_jobs?: number | null;
  member_since?: string | null;
  abn_status?: string | null;
  abn_verified_at?: string | null;
  premium_now?: boolean | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  abn?: string | null;
  business_name_display?: string | null;
};

function toUrl(platform: string, raw: string) {
  const v = (raw || '').trim();
  if (!v) return null;
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
      if (handle.startsWith('@') || handle.startsWith('channel/') || handle.startsWith('c/') || handle.startsWith('user/')) {
        return `https://youtube.com/${handle}`;
      }
      return `https://youtube.com/@${handle}`;
    default:
      return null;
  }
}

export function ProfileView({
  mode,
  profile,
  isMe: isMeProp,
}: {
  mode: ProfileViewMode;
  profile: any;
  isMe?: boolean;
}) {
  const isSelf = mode === 'self' || !!isMeProp;
  const { currentUser, updateUser } = useAuth();
  const store = useMemo(() => getStore(), []);
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const sb: any = supabase;
  const [isSimulated, setSimulated] = useSimulatedPremium();
  const [portalLoading, setPortalLoading] = useState(false);

  const profileUserId = profile?.id ?? null;
  const [upCount, setUpCount] = useState<number>(0);
  const [downCount, setDownCount] = useState<number>(0);
  const [myRating, setMyRating] = useState<1 | -1 | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const canRate =
    !!currentUser?.id &&
    !!profileUserId &&
    currentUser.id !== profileUserId &&
    myRating === null &&
    !isSubmittingRating;

  useEffect(() => {
    let cancelled = false;

    async function loadRatings() {
      if (!currentUser?.id || !profileUserId) return;

      const { data: mine } = await sb
        .from('user_ratings')
        .select('value')
        .eq('target_user_id', profileUserId)
        .eq('rater_user_id', currentUser.id)
        .maybeSingle();

      const mineValue = (mine as any)?.value;
      if (!cancelled && (mineValue === 1 || mineValue === -1)) setMyRating(mineValue);

      const { count: up } = await sb
        .from('user_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', profileUserId)
        .eq('value', 1);

      const { count: down } = await sb
        .from('user_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', profileUserId)
        .eq('value', -1);

      if (!cancelled) {
        setUpCount(up ?? 0);
        setDownCount(down ?? 0);
      }
    }

    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, profileUserId, supabase]);

  async function submitRating(value: 1 | -1) {
    if (!currentUser?.id || !profileUserId) return;
    if (currentUser.id === profileUserId) return;

    setIsSubmittingRating(true);
    try {
      const { error } = await sb.from('user_ratings').insert({
        target_user_id: profileUserId,
        rater_user_id: currentUser.id,
        value,
      });

      if (error) {
        if ((error as any).code === '23505') {
          setMyRating(value);
          return;
        }
        console.error('rating insert error', error);
        return;
      }

      setMyRating(value);
      if (value === 1) setUpCount((n) => n + 1);
      if (value === -1) setDownCount((n) => n + 1);
    } finally {
      setIsSubmittingRating(false);
    }
  }

  const reviews = isSelf && profile?.id ? store.getReviewsByRecipient(profile.id) : [];
  const reliabilityReviews = reviews.filter((r: any) => r.isReliabilityReview);
  const standardReviews = reviews.filter((r: any) => !r.isReliabilityReview);

  const userForDiscovery = isSelf && profile ? {
    is_premium: (profile as any).isPremium ?? (profile as any).premium_now ?? undefined,
    subscription_status: (profile as any).subscriptionStatus,
    subcontractor_sub_status: undefined,
    active_plan: (profile as any).activePlan,
    subcontractor_plan: undefined,
  } : null;
  const isPremiumForDiscoveryCheck = userForDiscovery ? isPremiumForDiscovery(userForDiscovery) : false;
  const showUpgradeNudge = isSelf && profile && !isPremiumForDiscoveryCheck && !isAdmin(profile);
  const showBillingSimulation = isSelf && BILLING_SIM_ALLOWED;
  const isUsingSimulation = showBillingSimulation && getSimulatedPremium();
  const hasRealPremium = isSelf && profile ? shouldShowProBadge(profile) : false;
  const planStatus = (() => {
    if (isUsingSimulation && !hasRealPremium) return 'Premium (Simulated)';
    if (hasRealPremium) return 'Pro Plan';
    return 'Free Plan';
  })();
  const dashboardPath = isSelf && profile ? (isAdmin(profile) ? '/admin' : '/dashboard') : '/dashboard';

  const handleResetSimulation = () => {
    clearSimulatedPremium();
    setSimulated(false);
    window.location.reload();
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    if (isSelf && profile?.id) {
      store.updateUser(profile.id, { avatar: `${newAvatarUrl}?v=${Date.now()}` });
    }
  };

  const p = profile as any;
  const abnStatusNorm = String(p?.abn_status ?? p?.abnStatus ?? '').toUpperCase();
  const isVerified = abnStatusNorm === 'VERIFIED' || !!(p?.abn_verified_at ?? p?.abnVerifiedAt);
  const displayName =
    (p?.name ?? p?.full_name ?? '').trim() ||
    (p?.email ? p.email.split('@')[0] : '') ||
    (p?.business_name ?? '').trim() ||
    'Profile';
  const businessName =
    (p?.showBusinessNameOnProfile === true || p?.show_business_name_on_profile === true)
      ? ((p?.businessName ?? p?.business_name) || '').trim()
      : (p?.business_name ?? p?.business_name_display ?? '').trim();
  const abnToShow =
    (p?.showAbnOnProfile === true || p?.show_abn_on_profile === true)
      ? ((p?.abn ?? '').trim())
      : (p?.abn ?? '').trim();
  const primaryTrade = p?.primaryTrade ?? p?.primary_trade ?? p?.trades?.[0] ?? null;
  const miniBio = p?.mini_bio ?? p?.miniBio ?? null;
  const bio = p?.bio ?? null;
  const rating = p?.rating ?? null;
  const reliabilityRating = p?.reliabilityRating ?? p?.reliability_rating ?? null;
  const showProBadge = !!(p?.premium_now ?? p?.isPremium ?? hasRealPremium);
  const links = (p?.links ?? {}) as Record<string, any>;
  const normalizedLinks = {
    website: links.website ?? links.Website ?? p?.website ?? null,
    instagram: links.instagram ?? links.Instagram ?? p?.instagram ?? null,
    facebook: links.facebook ?? links.Facebook ?? p?.facebook ?? null,
    linkedin: links.linkedin ?? links.linkedIn ?? links.LinkedIn ?? p?.linkedin ?? null,
    tiktok: links.tiktok ?? links.TikTok ?? p?.tiktok ?? null,
    youtube: links.youtube ?? links.YouTube ?? p?.youtube ?? null,
  };
  const socials = [
    { key: 'website', label: 'Website', Icon: Globe },
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
    { key: 'youtube', label: 'YouTube', Icon: Youtube },
  ] as const;
  const hasAnyLinks = socials.some(({ key }) => (normalizedLinks as any)?.[key]) || (normalizedLinks as any)?.tiktok;

  const totalVotes = upCount + downCount;
  const starAverage =
    totalVotes === 0
      ? 0
      : Number((1 + (upCount / totalVotes) * 4).toFixed(1));

  const avg = Number((p?.rating_avg ?? starAverage) || 0);
  const starClass =
    avg >= 4.5
      ? "text-yellow-500"
      : avg >= 3
        ? "text-amber-500"
        : "text-slate-400";
  const badgeBg =
    avg >= 4.5
      ? "from-yellow-100 via-yellow-50 to-white"
      : avg >= 3
        ? "from-amber-100 via-amber-50 to-white"
        : "from-slate-100 via-slate-50 to-white";

  return (
    <AppLayout>
      <PricingBlueWrapper className="bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
        <div className="mx-auto max-w-5xl px-4 py-10 text-white">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{isSelf ? 'My Profile' : 'Profile'}</h1>
            {isSelf ? (
              <Link href={dashboardPath}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/search">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Search
                </Button>
              </Link>
            )}
          </div>

          <div className="text-slate-900">
            <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="relative">
                {isSelf ? (
                  <ProfileCover
                    userId={profile.id}
                    coverUrl={p?.coverUrl ?? p?.cover_url ?? undefined}
                    onCoverUpdate={async (url) => {
                      await updateUser?.({ coverUrl: url });
                    }}
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border bg-slate-200">
                    <div className="relative h-[162px] sm:h-[198px] md:h-[234px] w-full">
                      {(p?.cover_url ?? p?.coverUrl) ? (
                        <Image src={p.cover_url ?? p.coverUrl} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />
                      )}
                    </div>
                  </div>
                )}

                <div className="absolute left-6 -bottom-14 z-10">
                  <div className="rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200">
                    <ProfileAvatar
                      userId={profile.id}
                      currentAvatarUrl={p?.avatar ?? undefined}
                      userName={displayName || 'TradeHub user'}
                      onAvatarUpdate={handleAvatarUpdate}
                      editable={isSelf}
                      size={120}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-14">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                        {displayName}
                      </h1>
                      {isVerified ? (
                        <div className="mt-0.5 scale-[0.95] origin-left">
                          <VerifiedBadge />
                        </div>
                      ) : (
                        isSelf && (
                          <Link
                            href="/verify-business"
                            className="inline-flex items-center gap-2 rounded-full border border-dashed border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-blue-300 bg-white text-[10px] font-bold text-blue-700">
                              ✓
                            </span>
                            Add verification badge
                          </Link>
                        )
                      )}
                      {showProBadge && <ProBadge size="md" />}
                    </div>

                    {miniBio && (
                      <div className="mt-2 text-sm md:text-base text-slate-600 leading-snug">{miniBio}</div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {businessName ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm">
                          <Building2 className="h-4 w-4 text-slate-600" />
                          <span>{businessName}</span>
                        </div>
                      ) : null}
                      {abnToShow ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm">
                          <BadgeCheck className="h-4 w-4 text-emerald-700" />
                          <span>ABN: {abnToShow}</span>
                        </div>
                      ) : null}
                      {isSelf &&
                        (p?.show_phone_on_profile === true || p?.showPhoneOnProfile === true) &&
                        String(p?.phone ?? p?.mobile ?? '').trim() ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-50">
                            <span className="text-[13px] leading-none text-slate-600">📞</span>
                          </span>
                          <span>{String(p?.phone ?? p?.mobile).trim()}</span>
                        </div>
                      ) : null}
                      {isSelf &&
                        (p?.show_email_on_profile === true || p?.showEmailOnProfile === true) &&
                        p?.email ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <span>{p.email}</span>
                        </div>
                      ) : null}
                    </div>

                    {primaryTrade ? (
                      (() => {
                        const Icon = getTradeIcon(primaryTrade);
                        return (
                          <div className="mt-4 flex items-center gap-2 text-lg md:text-xl font-semibold text-slate-800 tracking-tight">
                            <Icon className="h-5 w-5 text-blue-600" />
                            <span>{primaryTrade}</span>
                          </div>
                        );
                      })()
                    ) : null}
                  </div>

                  {isSelf && (
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
                  )}
                </div>

                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-white/70 p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br",
                          badgeBg,
                          "shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_4px_14px_rgba(251,191,36,0.25)]"
                        )}
                      >
                        <Star className={cn("h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]", starClass)} />
                      </span>

                      <div className="flex flex-col leading-tight">
                        <span className="text-lg font-semibold">
                          {totalVotes === 0 ? "0.0" : starAverage}
                        </span>
                        <span className="text-xs text-slate-500">
                          {totalVotes} ratings
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submitRating(1)}
                        disabled={!canRate}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                        aria-label="Thumbs up"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{upCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => submitRating(-1)}
                        disabled={!canRate}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                        aria-label="Thumbs down"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>{downCount}</span>
                      </button>
                    </div>
                  </div>

                  {!!reliabilityRating && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{reliabilityRating}</div>
                        <div className="text-sm text-gray-600">Reliability</div>
                      </div>
                    </div>
                  )}
                </div>

                {hasAnyLinks && (
                  <div className="mt-6">
                    <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-slate-300/60 to-transparent" />
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Links</div>
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
                )}

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
                            {isSelf && (
                              <span className="inline-flex items-center rounded-full bg-blue-600/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                {bio ? 'Tap to read' : 'Add bio'}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {bio
                              ? (bio.length > 88 ? `${bio.slice(0, 88)}…` : bio)
                              : isSelf
                              ? 'Tell people who you are and what you do.'
                              : 'No bio yet.'}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {isSelf && (
                          <span className="hidden sm:inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                            {bio ? 'Read bio →' : 'Add →'}
                          </span>
                        )}
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform group-open:rotate-180">
                          ⌄
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                      <p className="text-slate-700 leading-relaxed text-[15px] md:text-base">
                        {bio || 'No bio yet.'}
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {showUpgradeNudge && (
              <div className="mb-6 relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-5 shadow-sm">
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-orange-200/30 blur-2xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Want to appear in more searches?</p>
                    <p className="mt-1 text-xs text-amber-900/80">
                      You&apos;re currently visible within 20km. Upgrade to Premium to increase your discovery radius up to 100km.
                    </p>
                  </div>
                  <Link href="/pricing" className="shrink-0">
                    <Button
                      className="group relative rounded-xl px-5 py-2.5 font-semibold text-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/60 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.98]"
                    >
                      <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      View Premium
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {isSelf && p?.role === 'subcontractor' && (
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
            )}

            {showBillingSimulation && (
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
            )}

            {isSelf && reviews.length > 0 && (
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
            )}
          </div>
        </div>
      </PricingBlueWrapper>
    </AppLayout>
  );
}
