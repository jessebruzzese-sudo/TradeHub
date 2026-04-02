import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ProfileView } from '@/components/profile/profile-view';
import { PublicProfileNotFound } from '@/components/profile/public-profile-not-found';
import {
  getE2EProfileStrengthFixture,
  isE2EProfileStrengthFixtureId,
} from '@/lib/e2e/profile-strength-fixtures';
import { parseE2EPublicProfileSearchParams } from '@/lib/e2e/public-profile-search-params';
import { parseProfileStrengthRpcResult } from '@/lib/profile-strength';
import { loadPublicProfileForPage } from '@/lib/profiles/load-public-profile-for-page';
import { createServiceSupabase } from '@/lib/supabase-server';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

/** Per-request load (directory + fallbacks); avoids serving one cached HTML for different E2E inputs. */
export const dynamic = 'force-dynamic';

function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

export default async function PublicProfileByIdPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const profileId = params?.id?.trim();

  if (!profileId) {
    redirect('/dashboard');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('profile page params.id', profileId);
  }

  if (process.env.NODE_ENV !== 'production' && isE2EProfileStrengthFixtureId(profileId)) {
    const { profile, strengthCalc } = getE2EProfileStrengthFixture(profileId);
    return (
      <ProfileView mode="public" profile={profile as any} strengthCalc={strengthCalc} viewerLikeState={null} />
    );
  }

  const supabase = getSupabaseServer();

  const { data: currentUserData } = await supabase.auth.getUser();
  const authUser = currentUserData.user ?? null;
  let viewerId = authUser?.id ?? null;
  const { scenario: e2eScenario, viewerOverride: e2eViewerFromQuery } = parseE2EPublicProfileSearchParams(
    searchParams,
    profileId
  );
  if (e2eViewerFromQuery !== undefined) {
    viewerId = e2eViewerFromQuery;
  }
  const isMe = !!viewerId && profileId === viewerId;

  const loaded = await loadPublicProfileForPage(supabase, profileId, viewerId, {
    e2eScenarioQuery: e2eScenario,
  });
  if (!loaded.ok) {
    return <PublicProfileNotFound />;
  }

  let profileData: Record<string, unknown> = { ...loaded.data };
  try {
    const { data: tradeRow } = await (supabase as any)
      .from('users')
      .select('primary_trade, additional_trades')
      .eq('id', profileId)
      .maybeSingle();
    if (tradeRow) {
      const tradesList = getDisplayTradeListFromUserRow(tradeRow);
      profileData = {
        ...profileData,
        trades: tradesList,
        primary_trade: tradeRow.primary_trade ?? (profileData as { primary_trade?: string }).primary_trade,
      };
    }
  } catch {
    // non-blocking
  }

  let viewerHasLiked = false;
  if (viewerId && viewerId !== profileId) {
    const { data: existingLike } = await (supabase as any)
      .from('profile_likes')
      .select('id')
      .eq('liked_user_id', profileId)
      .eq('liked_by_user_id', viewerId)
      .maybeSingle();
    viewerHasLiked = !!existingLike;
  }

  try {
    const admin = createServiceSupabase();
    const { data: extra } = await admin
      .from('users')
      .select(
        'profile_strength_score, profile_strength_band, profile_likes_count, website_url, instagram_url, facebook_url, linkedin_url, google_business_url, google_business_name, google_business_address, google_place_id, google_rating, google_review_count, google_business_rating, google_business_review_count, google_listing_claimed_by_user, google_listing_verification_status, google_listing_verified_at, google_listing_verification_method, google_listing_verified_by, google_listing_rejection_reason, works_completed_count, jobs_posted_count, works_uploaded_count, last_active_at'
      )
      .eq('id', profileId)
      .maybeSingle();
    if (extra) {
      profileData = { ...profileData, ...(extra as object) };
    }
  } catch {
    // columns may not exist before migration
  }

  let strengthCalc = null;
  try {
    const admin = createServiceSupabase() as any;
    const { data: profileStrengthBreakdown } = await admin.rpc('calculate_profile_strength', {
      p_user_id: profileId,
    });
    const strength = Array.isArray(profileStrengthBreakdown)
      ? profileStrengthBreakdown[0]
      : profileStrengthBreakdown;
    strengthCalc = parseProfileStrengthRpcResult(strength);
  } catch {
    // RPC unavailable
  }

  const likesCount = Number((profileData as { profile_likes_count?: number }).profile_likes_count ?? 0);
  const viewerLikeState =
    viewerId && viewerId !== profileId ? { liked: viewerHasLiked, count: likesCount } : null;

  return (
    <div data-testid="public-profile-page">
      <ProfileView
        mode="public"
        profile={profileData as any}
        isMe={isMe}
        strengthCalc={strengthCalc}
        viewerLikeState={viewerLikeState}
      />
    </div>
  );
}
