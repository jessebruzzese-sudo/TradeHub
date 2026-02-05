/**
 * Single source of truth for permissions.
 * TradeHub uses a SINGLE account model: no separate builder/contractor/subcontractor roles.
 *
 * Rules:
 * - NEVER use user.role to determine access (except isAdmin for platform admin routes)
 * - Ownership is determined ONLY by matching IDs
 * - Commit actions (create/edit/apply/confirm/accept/award/publish) require verified ABN
 * - Browsing NEVER requires ABN
 * - Premium features enforced via capability-utils only
 */
import { hasValidABN } from '@/lib/abn-utils';
import { hasSubcontractorPremium, hasBuilderPremium, hasContractorPremium } from '@/lib/capability-utils';
export { isAdmin } from '@/lib/is-admin';

type UserLike = {
  id?: string;
  abn?: string | null;
  abnStatus?: string | null;
  additionalTradesUnlocked?: boolean;
} | null;

type JobLike = { id?: string; contractorId?: string | null } | null | undefined;

function capsUser(user: any) {
  // capability-utils may still expect role/name fields from older model; keep harmless defaults.
  return { ...(user ?? {}), name: user?.name ?? '', role: user?.role ?? '' };
}

export function isLoggedIn(user: UserLike): boolean {
  return !!user?.id;
}

export function ownsJob(user: UserLike, job: JobLike): boolean {
  if (!user?.id || !job?.contractorId) return false;
  return job.contractorId === user.id;
}

export function canCommitAction(user: UserLike): boolean {
  if (!user) return false;
  return hasValidABN(user as any);
}

export function canCreateJob(user: UserLike): boolean {
  return isLoggedIn(user) && canCommitAction(user);
}

export function canEditJob(user: UserLike, job: JobLike): boolean {
  return isLoggedIn(user) && ownsJob(user, job) && canCommitAction(user);
}

export function canUnlockMultiTrade(user: UserLike): boolean {
  if (!user) return false;
  return hasSubcontractorPremium(capsUser(user)) || user.additionalTradesUnlocked === true;
}

export function canUseSearchFromLocation(user: UserLike): boolean {
  if (!user) return false;
  return hasBuilderPremium(capsUser(user)) || hasContractorPremium(capsUser(user));
}
