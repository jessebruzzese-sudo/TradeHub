/**
 * ABN enforcement: gates ACTIONS ONLY (create/publish/apply/confirm/accept/award).
 * Browsing Jobs/Tenders/Messages is allowed for non-ABN users.
 */
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { hasValidABN, getABNGateUrl } from '@/lib/abn-utils';
import { safeRouterReplace } from '@/lib/safe-nav';

type UserLike = { id?: string; abnStatus?: string | null; abn_status?: string | null } | null;

export function needsBusinessVerification(currentUser: UserLike): boolean {
  // If user data hasn't loaded yet, don't gate here—pages should wait for isLoading/currentUser.
  if (!currentUser) return false;
  return !hasValidABN(currentUser as any);
}

export function getVerifyBusinessUrl(returnUrl?: string): string {
  const path =
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/';
  return getABNGateUrl(returnUrl || path || '/');
}

export function redirectToVerifyBusiness(router: AppRouterInstance, returnUrl?: string): void {
  const url = getVerifyBusinessUrl(returnUrl);
  safeRouterReplace(router, url, '/verify-business');
}
