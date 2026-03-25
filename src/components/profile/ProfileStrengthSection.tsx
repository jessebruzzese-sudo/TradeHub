'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import { hasValidABN } from '@/lib/abn-utils';
import { getActivityPoints, getActivityWarning, getInactiveDays } from '@/lib/profile-strength/activity-score';
import {
  getBandPillClassName,
  getMissingProfileImprovementItems,
  normalizeProfileStrengthBand,
  toScorePercent,
  type ProfileStrengthBand,
  type ProfileStrengthBreakdown,
} from '@/lib/profile-strength-ui';

type Props = {
  strengthCalc: ProfileStrengthCalc | null;
  profile: Record<string, any>;
};

const CATEGORY_MAX: Record<keyof Omit<ProfileStrengthBreakdown, 'score' | 'band'>, number> = {
  activity_points: 32,
  links_points: 15,
  google_points: 20,
  likes_points: 10,
  completeness_points: 13,
  abn_points: 10,
};

function meterPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function toBreakdown(strengthCalc: ProfileStrengthCalc | null, profile: Record<string, any>): ProfileStrengthBreakdown {
  const activityFromCalc = Number(strengthCalc?.activity ?? 0);
  const linksFromCalc = Number(strengthCalc?.links ?? 0);
  const googleFromCalc = Number(strengthCalc?.google ?? 0);
  const likesFromCalc = Number(strengthCalc?.likes ?? 0);
  const completenessFromCalc = Number(strengthCalc?.completeness ?? 0);
  const abnFromCalc = Number(strengthCalc?.abn ?? 0);
  const computedScoreFromCalc = Math.max(
    0,
    Math.min(100, Math.floor(activityFromCalc + linksFromCalc + googleFromCalc + likesFromCalc + completenessFromCalc + abnFromCalc))
  );
  const rawScore = Number(strengthCalc?.total ?? profile?.profile_strength_score ?? 0);
  const score = rawScore > 0 ? rawScore : computedScoreFromCalc;
  const band = normalizeProfileStrengthBand(strengthCalc?.band ?? profile?.profile_strength_band ?? 'LOW');
  const abnVerified = hasValidABN({
    abn: profile?.abn,
    abn_status: profile?.abn_status ?? profile?.abnStatus,
  });

  if (strengthCalc) {
    return {
      score,
      band,
      activity_points: activityFromCalc,
      links_points: linksFromCalc,
      google_points: googleFromCalc,
      likes_points: likesFromCalc,
      completeness_points: completenessFromCalc,
      abn_points: abnFromCalc,
    };
  }

  const lastFallback = profile?.last_active_at ?? profile?.lastActiveAt ?? null;
  return {
    score,
    band,
    activity_points: getActivityPoints(lastFallback),
    links_points: 0,
    google_points: 0,
    likes_points: 0,
    completeness_points: 0,
    abn_points: abnVerified ? 10 : 0,
  };
}

function scoreHelperLine(band: ProfileStrengthBand): string {
  if (band === 'STRONG') return 'Your profile is in strong shape. Keep your activity high to maintain visibility.';
  if (band === 'MEDIUM') return 'Complete more of your profile to improve trust and visibility.';
  return 'Verification and recent activity can improve how strong your profile appears.';
}

export default function ProfileStrengthSection({ strengthCalc, profile }: Props) {
  const breakdown = toBreakdown(strengthCalc, profile);
  const scorePct = toScorePercent(breakdown.score, 100);

  const hasWebsite = !!String(profile?.website_url ?? profile?.website ?? '').trim();
  const hasInstagram = !!String(profile?.instagram_url ?? profile?.instagram ?? '').trim();
  const hasProfileDescription = String(profile?.bio ?? '').trim().length >= 40;
  const uploadedCount =
    Number(profile?.works_uploaded_count ?? strengthCalc?.breakdown?.works_uploaded ?? 0) || 0;
  const hasCompletedWork = uploadedCount > 0;
  const likesCount = Number(profile?.profile_likes_count ?? 0) || 0;
  const hasLikes = likesCount > 0 || breakdown.likes_points > 0;
  const hasGoogleRating = !!String(profile?.google_business_url ?? '').trim();
  const abnVerified = breakdown.abn_points > 0;
  const lastActiveAt = strengthCalc?.last_active_at ?? profile?.last_active_at ?? profile?.lastActiveAt ?? null;
  const inactiveDays = typeof strengthCalc?.inactive_days === 'number'
    ? strengthCalc.inactive_days
    : getInactiveDays(lastActiveAt);
  const activityWarning = typeof strengthCalc?.inactive_days === 'number'
    ? (inactiveDays >= 30
        ? 'Your profile has been inactive. Open TradeHub to restore your activity score.'
        : inactiveDays >= 22
          ? 'Your activity score is starting to drop. Open TradeHub regularly to keep it strong.'
          : null)
    : getActivityWarning(lastActiveAt);

  const improvementItems = getMissingProfileImprovementItems({
    abnVerified,
    hasWebsite,
    hasInstagram,
    hasProfileDescription,
    hasCompletedWork,
    hasLikes,
    hasGoogleRating,
  });
  if (inactiveDays >= 22) {
    improvementItems.unshift({
      key: 'open_tradehub_activity',
      label: 'Open TradeHub to restore activity',
      description: inactiveDays >= 30
        ? 'Your activity contribution is currently at zero.'
        : 'Open TradeHub regularly to protect your activity points.',
      points: inactiveDays >= 30 ? 32 : 24,
      href: '/dashboard',
      completed: false,
      priority: 0,
      icon: ArrowRight,
    });
  }

  const lastActiveLabel = (() => {
    if (!lastActiveAt) return 'Not recently active';
    if (inactiveDays <= 0) return 'Today';
    if (inactiveDays === 1) return '1 day ago';
    return `${inactiveDays} days ago`;
  })();

  const rows: Array<{
    key: keyof Omit<ProfileStrengthBreakdown, 'score' | 'band'>;
    label: string;
    helper: string;
  }> = [
    { key: 'activity_points', label: 'Activity', helper: 'Based on when you last used TradeHub with an active session.' },
    { key: 'links_points', label: 'Links', helper: 'Website and social proof links.' },
    { key: 'google_points', label: 'Google rating', helper: 'Google Business profile and ratings.' },
    { key: 'likes_points', label: 'Likes', helper: 'Community engagement from other users.' },
    { key: 'completeness_points', label: 'Completeness', helper: 'Core profile fields and profile quality.' },
    { key: 'abn_points', label: 'ABN verification', helper: 'Business verification confidence signal.' },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 p-4 shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.14) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -bottom-36 -right-36 opacity-[0.05]" aria-hidden>
        <img src="/TradeHub-Mark-blackout.svg" alt="" className="h-[720px] w-[720px]" />
      </div>

      <div className="relative z-10 space-y-5">
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Profile strength</h3>
              <p className="mt-1 text-sm text-slate-600">
                A stronger profile helps other users trust your business.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getBandPillClassName(breakdown.band)}`}>
              {breakdown.band}
            </span>
          </div>

          <div className="mb-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {breakdown.score}
            <span className="ml-1 text-2xl font-semibold text-slate-500">/100</span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 transition-all"
              style={{ width: `${scorePct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Your score updates automatically as you improve your profile.
          </p>
          <p className="mt-1 text-xs font-medium text-slate-700">{scoreHelperLine(breakdown.band)}</p>
          <p className="mt-1 text-xs text-slate-500">Last active: {lastActiveLabel}</p>
          {activityWarning ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {activityWarning}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
            <h4 className="text-base font-semibold text-slate-900">Score breakdown</h4>
            <div className="mt-4 space-y-3">
              {rows.map((row) => {
                const value = breakdown[row.key];
                const max = CATEGORY_MAX[row.key];
                const percent = meterPercent(value, max);
                return (
                  <div key={row.key} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <span className="font-semibold text-slate-900">{value} pts</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-800" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{row.helper}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
            <h4 className="text-base font-semibold text-slate-900">Improve your score</h4>
            <p className="mt-1 text-sm text-slate-600">
              Complete more of your profile to improve trust and visibility.
            </p>

            {improvementItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {improvementItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href ?? '/profile/edit'}
                      className="group block rounded-2xl border border-slate-200 bg-white/80 p-3 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <p className="mt-0.5 text-xs text-slate-600">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                            +{item.points} pts
                          </span>
                          <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Your profile is in strong shape.</p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Keep your activity high to maintain visibility.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
