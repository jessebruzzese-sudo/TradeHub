import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { refreshProfileStrength } from '@/lib/profile-strength';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** POST — toggle like (insert if missing, delete if present). */
export async function POST(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const likedUserId = rawId?.trim() ?? '';
  if (!likedUserId || !UUID_RE.test(likedUserId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const supabase = (await createServerSupabase()) as any;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.id === likedUserId) {
    return NextResponse.json({ error: 'You cannot like your own profile' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('profile_likes')
    .select('id')
    .eq('liked_user_id', likedUserId)
    .eq('liked_by_user_id', user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from('profile_likes')
      .delete()
      .eq('liked_user_id', likedUserId)
      .eq('liked_by_user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await refreshProfileStrength(likedUserId);

    const { data: refreshedUser } = await supabase
      .from('users')
      .select('profile_likes_count, profile_strength_score, profile_strength_band')
      .eq('id', likedUserId)
      .maybeSingle();

    return NextResponse.json({
      liked: false,
      likesCount: refreshedUser?.profile_likes_count ?? 0,
      profileStrengthScore: refreshedUser?.profile_strength_score ?? 0,
      profileStrengthBand: refreshedUser?.profile_strength_band ?? 'LOW',
    });
  }

  const { error: insertError } = await supabase.from('profile_likes').insert({
    liked_user_id: likedUserId,
    liked_by_user_id: user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await refreshProfileStrength(likedUserId);

  const { data: refreshedUser } = await supabase
    .from('users')
    .select('profile_likes_count, profile_strength_score, profile_strength_band')
    .eq('id', likedUserId)
    .maybeSingle();

  return NextResponse.json({
    liked: true,
    likesCount: refreshedUser?.profile_likes_count ?? 0,
    profileStrengthScore: refreshedUser?.profile_strength_score ?? 0,
    profileStrengthBand: refreshedUser?.profile_strength_band ?? 'LOW',
  });
}

/** GET — whether the current user liked this profile + counts (service read for likes count when anon). */
export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const likedUserId = rawId?.trim() ?? '';
  if (!likedUserId || !UUID_RE.test(likedUserId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const supabase = (await createServerSupabase()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = (await createServiceSupabase()) as any;
  const { data: countRow } = await admin.from('users').select('profile_likes_count').eq('id', likedUserId).maybeSingle();

  const likesCount = Number((countRow as { profile_likes_count?: number } | null)?.profile_likes_count ?? 0);

  if (!user?.id) {
    return NextResponse.json({ liked: false, likesCount });
  }

  const { data: row } = await admin
    .from('profile_likes')
    .select('id')
    .eq('liked_user_id', likedUserId)
    .eq('liked_by_user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    liked: !!row,
    likesCount,
  });
}
