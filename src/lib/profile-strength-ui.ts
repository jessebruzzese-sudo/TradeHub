import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Globe,
  Heart,
  Instagram,
  Star,
} from 'lucide-react';

export type ProfileStrengthBand = 'LOW' | 'MEDIUM' | 'STRONG';

export type ProfileStrengthBreakdown = {
  score: number;
  band: ProfileStrengthBand;
  activity_points: number;
  links_points: number;
  google_points: number;
  likes_points: number;
  completeness_points: number;
  abn_points: number;
};

export type ProfileImprovementItem = {
  key: string;
  label: string;
  description: string;
  points: number;
  href?: string;
  completed: boolean;
  priority: number;
  icon: LucideIcon;
};

export type ProfileImprovementInput = {
  abnVerified?: boolean;
  hasWebsite?: boolean;
  hasInstagram?: boolean;
  hasProfileDescription?: boolean;
  hasCompletedWork?: boolean;
  hasLikes?: boolean;
  hasGoogleRating?: boolean;
};

export function normalizeProfileStrengthBand(rawBand: string | null | undefined): ProfileStrengthBand {
  const normalized = String(rawBand ?? 'LOW').toUpperCase();
  if (normalized === 'ELITE' || normalized === 'HIGH' || normalized === 'STRONG') return 'STRONG';
  if (normalized === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

export function toScorePercent(score: number, max = 100): number {
  if (!Number.isFinite(score) || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

export function getBandPillClassName(band: ProfileStrengthBand): string {
  if (band === 'STRONG') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (band === 'MEDIUM') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

/**
 * Reads denormalized profile strength from API/profile objects.
 * Uses explicit numeric / null checks so a score of 0 is not treated as "missing".
 */
export function getProfileStrengthScoreFromRow(
  p: Record<string, unknown> | null | undefined
): number | null {
  if (p == null) return null;
  const snake = p.profile_strength_score;
  const camel = p.profileStrengthScore;
  if (typeof snake === 'number' && Number.isFinite(snake)) return snake;
  if (typeof camel === 'number' && Number.isFinite(camel)) return camel;
  if (snake !== null && snake !== undefined && String(snake).trim() !== '') {
    const n = Number(snake);
    if (Number.isFinite(n)) return n;
  }
  if (camel !== null && camel !== undefined && String(camel).trim() !== '') {
    const n = Number(camel);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function getMissingProfileImprovementItems(
  input: ProfileImprovementInput
): ProfileImprovementItem[] {
  const items: ProfileImprovementItem[] = [
    {
      key: 'verify_abn',
      label: 'Verify your ABN',
      description: 'Verification helps other users trust your business.',
      points: 10,
      href: '/verify-business',
      completed: !!input.abnVerified,
      priority: 1,
      icon: BadgeCheck,
    },
    {
      key: 'google_rating',
      label: 'Add Google rating',
      description: 'Link your Google Business profile and rating.',
      points: 6,
      href: '/profile/edit',
      completed: !!input.hasGoogleRating,
      priority: 2,
      icon: Star,
    },
    {
      key: 'completed_work',
      label: 'Add completed work',
      description: 'Show recent projects to strengthen your profile.',
      points: 6,
      href: '/works/create',
      completed: !!input.hasCompletedWork,
      priority: 3,
      icon: BriefcaseBusiness,
    },
    {
      key: 'website',
      label: 'Add business website',
      description: 'A website gives buyers extra confidence.',
      points: 4,
      href: '/profile/edit',
      completed: !!input.hasWebsite,
      priority: 4,
      icon: Globe,
    },
    {
      key: 'profile_description',
      label: 'Add profile description',
      description: 'A clear description improves trust and visibility.',
      points: 4,
      href: '/profile/edit',
      completed: !!input.hasProfileDescription,
      priority: 5,
      icon: FileText,
    },
    {
      key: 'first_like',
      label: 'Receive your first like',
      description: 'Likes signal positive engagement on TradeHub.',
      points: 3,
      href: '/search',
      completed: !!input.hasLikes,
      priority: 6,
      icon: Heart,
    },
    {
      key: 'instagram',
      label: 'Add Instagram link',
      description: 'Social links add extra proof of your work.',
      points: 2,
      href: '/profile/edit',
      completed: !!input.hasInstagram,
      priority: 7,
      icon: Instagram,
    },
  ];

  return items
    .filter((item) => !item.completed)
    .sort((a, b) => b.points - a.points || a.priority - b.priority);
}
