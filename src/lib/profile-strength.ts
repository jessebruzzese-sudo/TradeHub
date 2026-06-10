import type { ProfileStrengthCalc } from '@/lib/profile-strength-types';
import {
  profileStrengthBandFromTotal,
  sumProfileStrengthCategoryPoints,
} from '@/lib/profile-strength/compute-total';

export type { ProfileStrengthCalc };

/** Log label for which branch handled the strength fetch (server logs / debugging). */
export type ProfileStrengthFetchPath =
  | 'rpc_success'
  | 'user_not_found_fallback'
  | 'rpc_error_fallback'
  | 'parse_fallback'
  | 'unexpected_fallback';

/** Safe baseline when RPC fails, user row is missing, or payload cannot be parsed. */
export function emptyProfileStrengthCalc(): ProfileStrengthCalc {
  return {
    total: 0,
    band: 'LOW',
    activity: 0,
    links: 0,
    google: 0,
    likes: 0,
    completeness: 0,
    abn: 0,
    last_active_at: null,
    inactive_days: 0,
  };
}
