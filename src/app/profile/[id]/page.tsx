import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ProfileView } from '@/components/profile/profile-view';
import { isLikelyTestAccount } from '@/lib/test-account';
import { parseProfileStrengthRpcResult } from '@/lib/profile-strength';
import { createServiceSupabase } from '@/lib/supabase-server';

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
        set() {
          // no-op in a read-only server component
        },
        remove() {
          // no-op in a read-only server component
        },
      },
    }
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const profileId = params?.id;

  if (!profileId) {
    redirect('/profile');
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from('public_profile_directory')
    .select(
      `id,
       name,
       business_name,
       avatar,
       cover_url,
       trades,
       location,
       postcode,
       mini_bio,
       bio,
       rating,
       reliability_rating,
       completed_jobs,
       member_since,
       abn_status,
       abn_verified_at,
       premium_now,
       website,
       instagram,
       facebook,
       linkedin,
       tiktok,
       youtube,
       abn,
       pricing_type,
       pricing_amount,
       show_pricing_on_profile`
    )
    .eq('id', profileId)
    .eq('is_public_profile', true)
    .maybeSingle();

  if (error || !data) return notFound();
  if (
    isLikelyTestAccount({
      name: (data as any).name,
      businessName: (data as any).business_name,
    })
  ) {
    return notFound();
  }

  // Fetch user_trades for multi-trade display (when available)
  let profileData = { ...data };
  try {
    const { data: utRows } = await (supabase as any)
      .from('user_trades')
      .select('trade, is_primary')
      .eq('user_id', profileId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    if (utRows && utRows.length > 0) {
      const trades = utRows.map((r: { trade: string }) => r.trade).filter(Boolean);
      const primary = utRows.find((r: { is_primary: boolean }) => r.is_primary)?.trade ?? utRows[0]?.trade;
      profileData = {
        ...data,
        trades,
        primary_trade: primary ?? (data as any).primary_trade,
      } as typeof profileData;
    }
  } catch {
    // user_trades may not exist
  }

  const { data: currentUserData } = await supabase.auth.getUser();
  const authUser = currentUserData.user ?? null;
  const isMe = !!authUser?.id && profileId === authUser.id;

  const viewerId = authUser?.id ?? null;
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
    <ProfileView
      mode="public"
      profile={profileData as any}
      isMe={isMe}
      strengthCalc={strengthCalc}
      viewerLikeState={viewerLikeState}
    />
  );
}
