// @ts-nocheck
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
  ArrowRight,
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
  CalendarDays,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';

import { getTradeIcon } from '@/lib/trade-icons';
import { hasValidABN } from '@/lib/abn-utils';
import { AppLayout } from '@/components/app-nav';
import { ReliabilityReviewCard } from '@/components/reliability-review-card';
import { PreviousWorkSection } from '@/components/profile/previous-work-section';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileCover } from '@/components/profile-cover';
import { ProBadge } from '@/components/pro-badge';
import { PricingBlueWrapper } from '@/components/marketing/PricingBlueWrapper';
import { VerifiedBadge } from '@/components/verified-badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
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
import { useRouter } from 'next/navigation';
import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import ProfileSummaryTrustBar from '@/components/profile/ProfileSummaryTrustBar';
import ProfileStrengthSection from '@/components/profile/ProfileStrengthSection';
import LikeProfileButton from '@/components/profile/LikeProfileButton';

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
  pricing_type?: string | null;
  pricing_amount?: number | null;
  show_pricing_on_profile?: boolean | null;
};

function proofHrefWebsite(raw: string | null | undefined) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/\//, '')}`;
}

function proofHrefInstagram(raw: string | null | undefined) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, '')}`;
}

function proofHrefFacebook(raw: string | null | undefined) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://facebook.com/${v}`;
}

function proofHrefLinkedin(raw: string | null | undefined) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return v.startsWith('in/') || v.startsWith('company/')
    ? `https://linkedin.com/${v}`
    : `https://linkedin.com/in/${v}`;
}

function proofHrefGoogleBusiness(raw: string | null | undefined) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

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

function linkChipClass(platform: string) {
  const base =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all duration-200 hover:-translate-y-[1px]';
  switch (platform) {
    case 'website':
      return cn(base, 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100');
    case 'linkedin':
      return cn(base, 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100');
    case 'instagram':
      return cn(base, 'border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100');
    case 'facebook':
      return cn(base, 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100');
    case 'youtube':
      return cn(base, 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100');
    case 'tiktok':
      return cn(base, 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100');
    default:
      return cn(base, 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50');
  }
}

function reliabilityToPercent(r: number | null | undefined): number | null {
  if (r == null || !Number.isFinite(Number(r))) return null;
  const v = Number(r);
  if (v <= 5) return Math.round((v / 5) * 100);
  return Math.round(Math.min(100, v));
}

export function ProfileView({
  mode,
  profile,
  isMe: isMeProp,
  strengthCalc: strengthCalcProp,
  viewerLikeState: viewerLikeStateProp,
}: {
  mode: ProfileViewMode;
  profile: any;
  isMe?: boolean;
  /** Server-fetched breakdown; if omitted, client loads `/api/profile/[id]/strength`. */
  strengthCalc?: ProfileStrengthCalc | null;
  /** From `/profile/[id]` server: whether viewer liked + total likes count (skips client GET). */
  viewerLikeState?: { liked: boolean; count: number } | null;
}) {
  const isSelf = mode === 'self' || !!isMeProp;
  const { currentUser, updateUser, refreshUser } = useAuth();
  const router = useRouter();
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

  const [availDates, setAvailDates] = useState<string[]>([]);
  const [availDesc, setAvailDesc] = useState<string>('');
  const [availLoading, setAvailLoading] = useState(false);
  const [alertsUpsellOpen, setAlertsUpsellOpen] = useState(false);
  const [strengthCalc, setStrengthCalc] = useState<ProfileStrengthCalc | null>(strengthCalcProp ?? null);
  const [likeInitial, setLikeInitial] = useState<{ liked: boolean; count: number } | null>(
    viewerLikeStateProp ?? null
  );
  const today = startOfDay(new Date());

  useEffect(() => {
    setStrengthCalc(strengthCalcProp ?? null);
  }, [strengthCalcProp, profileUserId]);

  useEffect(() => {
    if (strengthCalcProp) return;
    const id = (profile as any)?.id as string | undefined;
    if (!id) return;
    let cancelled = false;
    fetch(`/api/profile/${id}/strength`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || j?.error) return;
        setStrengthCalc(j as ProfileStrengthCalc);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileUserId, strengthCalcProp]);

  useEffect(() => {
    if (viewerLikeStateProp != null) {
      setLikeInitial(viewerLikeStateProp);
    }
  }, [viewerLikeStateProp]);

  useEffect(() => {
    if (viewerLikeStateProp != null) return;
    if (!profileUserId || !currentUser?.id || currentUser.id === profileUserId) {
      setLikeInitial(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/profile/${profileUserId}/like`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setLikeInitial({
          liked: !!j.liked,
          count: typeof j.likesCount === 'number' ? j.likesCount : 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [viewerLikeStateProp, profileUserId, currentUser?.id]);

  useEffect(() => {
    const id = (profile as any)?.id;
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setAvailLoading(true);
        const supabase = getBrowserSupabase();
        let descFromRows = '';

        const { data: rows, error } = await supabase
          .from('subcontractor_availability')
          .select('date, description')
          .eq('user_id', id)
          .order('date', { ascending: true });

        if (cancelled) return;
        if (!error && rows) {
          setAvailDates(rows.map((r: any) => r.date));
          const firstWithDesc = rows.find((r: any) => r.description && String(r.description).trim() !== '');
          if (firstWithDesc?.description) {
            descFromRows = String(firstWithDesc.description);
            setAvailDesc(descFromRows);
          }
        }

        if (!cancelled) {
          const { data: u } = await supabase
            .from('users')
            .select('availability_description')
            .eq('id', id)
            .maybeSingle();

          if (u?.availability_description && !descFromRows.trim()) {
            setAvailDesc(u.availability_description);
          }
        }
      } catch (e) {
        console.error('[profile] load availability failed', e);
        if (!cancelled) setAvailDates([]);
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.id]);

  const nextAvailable = useMemo(() => {
    const future = availDates
      .map((d) => new Date(d))
      .filter((d) => !isAfter(today, d));
    if (future.length === 0) return null;
    future.sort((a, b) => a.getTime() - b.getTime());
    return future[0];
  }, [availDates, today]);

  const upcomingCount = useMemo(() => {
    const future = availDates
      .map((d) => new Date(d))
      .filter((d) => !isAfter(today, d));
    return future.length;
  }, [availDates, today]);

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
    plan: (profile as any).plan ?? null,
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

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    if (!isSelf || !profile?.id) return;
    // Optimistic local update for immediate UI refresh.
    store.updateUser(profile.id, { avatar: `${newAvatarUrl}?v=${Date.now()}` });
    try {
      await updateUser?.({ avatar: newAvatarUrl });
    } catch (e: any) {
      console.error('[profile] avatar db update failed', e);
      throw new Error(e?.message ?? 'Failed to save profile photo');
    }
  };

  const p = profile as any;

  // Pricing: use profile from API, or currentUser when viewing own profile (auth has full data)
  const pricingSource = isSelf ? (currentUser as any) : p;
  const showPricing = pricingSource?.show_pricing_on_profile === true || pricingSource?.showPricingOnProfile === true;
  const pricingType = pricingSource?.pricing_type ?? pricingSource?.pricingType ?? null;
  const pricingAmount = pricingSource?.pricing_amount != null ? Number(pricingSource.pricing_amount) : (pricingSource?.pricingAmount != null ? Number(pricingSource.pricingAmount) : null);
  const pricingLabel = (() => {
    if (!showPricing || !pricingType) return null;
    if (pricingType === 'hourly' && pricingAmount != null && pricingAmount > 0) return `$${pricingAmount}/hr`;
    if (pricingType === 'from_hourly' && pricingAmount != null && pricingAmount > 0) return `From $${pricingAmount}/hr`;
    if (pricingType === 'day' && pricingAmount != null && pricingAmount > 0) return `$${pricingAmount}/day`;
    if (pricingType === 'day') return 'Day rate available';
    if (pricingType === 'quote_on_request') return 'Pricing on enquiry';
    return null;
  })();
  const isVerified = hasValidABN(p);
  const displayName =
    (p?.name ?? p?.full_name ?? '').trim() ||
    (p?.email ? p.email.split('@')[0] : '') ||
    (p?.business_name ?? '').trim() ||
    'Profile';
  const shouldShowBusinessName =
    p?.showBusinessNameOnProfile === true || p?.show_business_name_on_profile === true;
  const businessName = shouldShowBusinessName
    ? ((p?.businessName ?? p?.business_name) || '').trim()
    : '';
  const shouldShowAbn =
    p?.showAbnOnProfile === true || p?.show_abn_on_profile === true;
  const abnToShow = shouldShowAbn ? ((p?.abn ?? '').trim()) : '';
  const primaryTrade = p?.primaryTrade ?? p?.primary_trade ?? p?.trades?.[0] ?? null;
  const allTrades = (p?.trades ?? []) as string[];
  const otherTrades = primaryTrade
    ? allTrades.filter((t) => t && t.trim() !== primaryTrade.trim())
    : allTrades;
  const miniBio = p?.mini_bio ?? p?.miniBio ?? null;
  const bio = p?.bio ?? null;
  const rating = p?.rating ?? null;
  const reliabilityRating = p?.reliabilityRating ?? p?.reliability_rating ?? null;
  const showProBadge = !!(p?.premium_now ?? p?.isPremium ?? hasRealPremium);
  const links = (p?.links ?? {}) as Record<string, any>;
  const normalizedLinks = {
    website: links.website ?? links.Website ?? p?.website_url ?? p?.website ?? null,
    instagram: links.instagram ?? links.Instagram ?? p?.instagram_url ?? p?.instagram ?? null,
    facebook: links.facebook ?? links.Facebook ?? p?.facebook_url ?? p?.facebook ?? null,
    linkedin: links.linkedin ?? links.linkedIn ?? links.LinkedIn ?? p?.linkedin_url ?? p?.linkedin ?? null,
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
  const strengthScoreStored =
    p?.profile_strength_score != null
      ? Number(p.profile_strength_score)
      : p?.profileStrengthScore != null
        ? Number(p.profileStrengthScore)
        : null;
  const strengthBandStored =
    p?.profile_strength_band != null
      ? String(p.profile_strength_band)
      : p?.profileStrengthBand != null
        ? String(p.profileStrengthBand)
        : null;
  const strengthPct =
    strengthScoreStored != null && !Number.isNaN(strengthScoreStored) ? strengthScoreStored : null;
  const strengthBand = strengthBandStored ?? strengthCalc?.band ?? 'LOW';
  const reliabilityPct = reliabilityToPercent(reliabilityRating);
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!isSelf && profileUserId && currentUser?.id && currentUser.id !== profileUserId && (
                  <LikeProfileButton
                    profileUserId={profileUserId}
                    initialLiked={likeInitial?.liked ?? false}
                    initialLikesCount={likeInitial?.count ?? 0}
                    onUpdated={(p) => {
                      if (p.profileStrengthScore != null && p.profileStrengthBand) {
                        setStrengthCalc((prev) => {
                          const base: ProfileStrengthCalc = prev ?? {
                            total: 0,
                            band: 'LOW',
                            activity: 0,
                            links: 0,
                            google: 0,
                            likes: 0,
                            completeness: 0,
                          };
                          return {
                            ...base,
                            total: p.profileStrengthScore ?? base.total,
                            band: p.profileStrengthBand ?? base.band,
                          };
                        });
                        return;
                      }
                      fetch(`/api/profile/${profileUserId}/strength`, { credentials: 'include' })
                        .then((r) => r.json())
                        .then((j) => {
                          if (!j?.error) setStrengthCalc(j as ProfileStrengthCalc);
                        })
                        .catch(() => {});
                    }}
                  />
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    if (profileUserId) {
                      store.ensureUserInStore({
                        id: profileUserId,
                        name: displayName || undefined,
                        avatar: p?.avatar ?? undefined,
                      });
                      router.push(`/messages?userId=${profileUserId}`);
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
                <Link href="/search">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Search
                  </Button>
                </Link>
              </div>
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

                    <div className="mt-4">
                      <ProfileSummaryTrustBar
                        rating={avg}
                        reviewCount={Number((p as any)?.rating_count ?? totalVotes)}
                        reliabilityPercent={reliabilityPct}
                        profileStrengthScore={
                          strengthPct != null && !Number.isNaN(Number(strengthPct))
                            ? Number(strengthPct)
                            : null
                        }
                      />
                    </div>

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
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-lg md:text-xl font-semibold text-slate-800 tracking-tight">
                          {(() => {
                            const Icon = getTradeIcon(primaryTrade);
                            return (
                              <>
                                <Icon className="h-5 w-5 text-blue-600" />
                                <span>{primaryTrade}</span>
                              </>
                            );
                          })()}
                        </div>
                        {otherTrades.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {otherTrades.slice(0, 5).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {t}
                              </span>
                            ))}
                            {otherTrades.length > 5 && (
                              <span className="text-xs text-slate-500">+{otherTrades.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
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

                  {pricingLabel && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <span className="text-sm font-semibold text-slate-600">$</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{pricingLabel}</div>
                        <div className="text-xs text-slate-500">Pricing</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <ProfileStrengthSection strengthCalc={strengthCalc} profile={p} />
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
                            className={linkChipClass(key)}
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
                                className={linkChipClass('tiktok')}
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

            {profileUserId ? (
              <PreviousWorkSection
                userId={profileUserId}
                isSelf={isSelf}
                primaryTradeLabel={typeof primaryTrade === 'string' && primaryTrade.trim() ? primaryTrade.trim() : null}
              />
            ) : null}

            {isSelf && (
              <Card className="mb-6 border-blue-200 bg-gradient-to-b from-blue-50/60 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-slate-600" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nextAvailable ? (
                    <div className="text-sm">
                      <div className="text-slate-600">Next available</div>
                      <div className="font-semibold text-slate-900">{format(nextAvailable, 'EEE d MMM yyyy')}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">No dates listed yet.</div>
                  )}

                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{upcomingCount}</span>{' '}
                    {upcomingCount === 1 ? 'day' : 'days'} listed
                  </div>

                  {availDesc?.trim() ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      {availDesc.trim()}
                    </div>
                  ) : null}

                  <div className="pt-1">
                    <Link href="/profile/availability">
                      <Button variant="outline" className="gap-2">
                        Update availability <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {isSelf && (
              <div className="mb-6">
                {/* Mobile: collapsible */}
                <div className="md:hidden">
                  <Collapsible open={alertsUpsellOpen} onOpenChange={setAlertsUpsellOpen}>
                    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white shadow-sm">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-100/50 active:bg-amber-100"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Crown className="h-5 w-5 shrink-0 text-amber-700" />
                            <p className="text-sm font-semibold text-amber-900 truncate">
                              Receive alerts when new jobs in your trade are listed
                            </p>
                          </div>
                          <span className="shrink-0 text-amber-700" aria-hidden>
                            {alertsUpsellOpen ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-amber-200/80 px-4 pb-4 pt-3">
                          <p className="text-xs text-amber-900/80">
                            Get notified when relevant jobs matching your trade are posted.
                          </p>
                          {!(hasRealPremium || isUsingSimulation) && (
                            <p className="mt-1 text-xs text-amber-800/70">Premium unlocks email alerts.</p>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {(hasRealPremium || isUsingSimulation) ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-amber-900">Receive alerts</span>
                                <Switch
                                  checked={(profile as any)?.receiveTradeAlerts ?? (profile as any)?.receive_trade_alerts ?? false}
                                  onCheckedChange={async (checked) => {
                                    if (profile?.id && currentUser?.id === profile.id) {
                                      try {
                                        const res = await fetch('/api/profile/trade-alerts', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ enabled: checked }),
                                        });
                                        if (!res.ok) {
                                          const data = await res.json().catch(() => ({}));
                                          throw new Error(data?.error ?? 'Failed to update');
                                        }
                                        await refreshUser?.();
                                      } catch (e) {
                                        console.warn('Could not save alert preference:', e);
                                        toast.error('Could not save. Please try again.');
                                      }
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 opacity-60">
                                  <span className="text-sm font-medium text-amber-900">Receive alerts</span>
                                  <Switch disabled checked={false} />
                                </div>
                                <Link href="/pricing" className="shrink-0">
                                  <Button
                                    className="group relative rounded-xl px-5 py-2.5 font-semibold text-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/60 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.98]"
                                  >
                                    <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                                    View Premium
                                  </Button>
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>
                {/* Desktop: always expanded */}
                <div className="hidden md:block relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-5 shadow-sm">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                  <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-orange-200/30 blur-2xl" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        Receive alerts when new jobs in your trade are listed
                      </p>
                      <p className="mt-1 text-xs text-amber-900/80">
                        Get notified when relevant jobs matching your trade are posted.
                      </p>
                      {!(hasRealPremium || isUsingSimulation) && (
                        <p className="mt-1 text-xs text-amber-800/70">Premium unlocks email alerts.</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      {(hasRealPremium || isUsingSimulation) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-amber-900">Receive alerts</span>
                          <Switch
                            checked={(profile as any)?.receiveTradeAlerts ?? (profile as any)?.receive_trade_alerts ?? false}
                            onCheckedChange={async (checked) => {
                              if (profile?.id && currentUser?.id === profile.id) {
                                try {
                                  const res = await fetch('/api/profile/trade-alerts', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ enabled: checked }),
                                  });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data?.error ?? 'Failed to update');
                                  }
                                  await refreshUser?.();
                                } catch (e) {
                                  console.warn('Could not save alert preference:', e);
                                  toast.error('Could not save. Please try again.');
                                }
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 opacity-60">
                            <span className="text-sm font-medium text-amber-900">Receive alerts</span>
                            <Switch disabled checked={false} />
                          </div>
                          <Link href="/pricing" className="shrink-0">
                            <Button
                              className="group relative rounded-xl px-5 py-2.5 font-semibold text-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/60 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.98]"
                            >
                              <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                              View Premium
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showUpgradeNudge && (
              <div className="mb-6">
                <PremiumUpsellBar
                  title="Want to appear in more searches?"
                  description="You're currently visible within 20km. Upgrade to Premium to increase your discovery radius up to 100km."
                  ctaLabel="View Premium"
                  href="/pricing"
                />
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
