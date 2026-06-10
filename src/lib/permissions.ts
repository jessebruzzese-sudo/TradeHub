/**
 * Single source of truth for permissions.
 *
 * Rules:
 * - NEVER use user.role for admin checks (use is_admin + isAdmin()).
 * - Job posts: Supabase RLS requires `users.role = 'contractor'` plus row ownership to INSERT/UPDATE/DELETE own `jobs` rows.
 *   (Admin moderation uses a separate jobs UPDATE policy.) UI and API mirror the contractor rule for clear UX.
 * - ABN is not required to post or edit jobs (see verification-guard for apply/hire flows).
 * - Browsing NEVER requires ABN.
 * - Premium features enforced via capability-utils.
 */
import { hasSubcontractorPremium, hasBuilderPremium, hasContractorPremium } from '@/lib/capability-utils';
export { isAdmin } from '@/lib/is-admin';

type UserLike = {
  id?: string;
  role?: string | null;
  abn?: string | null;
  abnStatus?: string | null;
  additionalTradesUnlocked?: boolean;
} | null;

// no role separation anymore for constractors and
// sub contractors
export function hasContractorRoleForJobPosting(user: UserLike): boolean {
	return true;
}

type JobLike = { id?: string; contractorId?: string | null } | null | undefined;

export function isLoggedIn(user: UserLike): boolean {
  return !!user?.id;
}

export function ownsJob(user: UserLike, job: JobLike): boolean {
  if (!user?.id) return false;
  return job.owner.id === user.id;
}

export function canCreateJob(user: UserLike): boolean {
  return isLoggedIn(user) && hasContractorRoleForJobPosting(user);
}

export function canEditJob(user: UserLike, job: JobLike): boolean {
  return isLoggedIn(user) && ownsJob(user, job) && hasContractorRoleForJobPosting(user);
}

export function canUnlockMultiTrade(user: UserLike): boolean {
  if (!user) return false;
  return hasSubcontractorPremium(user) || user.additionalTradesUnlocked === true;
}

export function canUseSearchFromLocation(user: UserLike): boolean {
  if (!user) return false;
  return hasBuilderPremium(user) || hasContractorPremium(user);
}
