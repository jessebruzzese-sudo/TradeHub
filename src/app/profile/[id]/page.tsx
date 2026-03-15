import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ProfileView } from '@/components/profile/profile-view';

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
    .maybeSingle();

  if (error || !data) return notFound();

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

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const isMe = !!authUser?.id && profileId === authUser.id;

  return <ProfileView mode="public" profile={profileData as any} isMe={isMe} />;
}
