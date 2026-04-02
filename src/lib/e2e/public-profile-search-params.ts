/**
 * Synthetic profile id for Playwright only. Never use a real user id here — query-driven seams would
 * affect that profile in local/staging dev.
 */
export const E2E_PUBLIC_PROFILE_REGRESSION_ID = '00000000-0000-4000-8000-00000000e2e01';

/**
 * E2E-only query keys for `/profiles/[id]`. Honored only for {@link E2E_PUBLIC_PROFILE_REGRESSION_ID}
 * when `NODE_ENV !== 'production'`. Query params reach the RSC reliably.
 */
const SCENARIO_KEY = '__e2e_public_profile';
const VIEWER_KEY = '__e2e_viewer';

function firstString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0] != null) return String(value[0]);
  return undefined;
}

export function parseE2EPublicProfileSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  profileId: string
): { scenario: string | null; viewerOverride: string | null | undefined } {
  if (process.env.NODE_ENV === 'production' || profileId !== E2E_PUBLIC_PROFILE_REGRESSION_ID) {
    return { scenario: null, viewerOverride: undefined };
  }
  const rawS = firstString(searchParams?.[SCENARIO_KEY]);
  const scenario = rawS?.trim() ? rawS.trim() : null;

  const rawV = firstString(searchParams?.[VIEWER_KEY]);
  if (rawV === undefined) {
    return { scenario, viewerOverride: undefined };
  }
  const t = rawV.trim();
  if (t === '' || t === '_') {
    return { scenario, viewerOverride: null };
  }
  return { scenario, viewerOverride: t };
}
