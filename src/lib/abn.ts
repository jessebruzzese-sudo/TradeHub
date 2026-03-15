import { isAbnVerified as isAbnVerifiedFromUtils } from '@/lib/abn-utils';

/**
 * @deprecated Use isAbnVerified from '@/lib/abn-utils' instead.
 * Re-exported for backward compatibility.
 */
export const isAbnVerified = isAbnVerifiedFromUtils;

export function abnLabel(u: Parameters<typeof isAbnVerifiedFromUtils>[0]): 'verified' | 'unverified' {
  return isAbnVerifiedFromUtils(u) ? 'verified' : 'unverified';
}
