import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from('user_locations')
    .select('id, location, postcode, lat, lng, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[profile/locations] GET error:', error);
    return NextResponse.json({ error: 'Failed to load locations' }, { status: 500 });
  }

  return NextResponse.json({ locations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const location = typeof body?.location === 'string' ? body.location.trim() : '';
  const postcode = typeof body?.postcode === 'string' ? body.postcode.trim() || null : null;
  const lat = typeof body?.lat === 'number' ? body.lat : null;
  const lng = typeof body?.lng === 'number' ? body.lng : null;

  if (!location) {
    return NextResponse.json({ error: 'Location is required' }, { status: 400 });
  }

  const { data: dbUser, error: userError } = await (supabase as any)
    .from('users')
    .select('id, plan, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status, complimentary_premium_until, premium_until')
    .eq('id', user.id)
    .maybeSingle();

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  if (getTier(dbUser) !== 'premium') {
    return NextResponse.json(
      { error: 'Multiple locations require Premium' },
      { status: 403 }
    );
  }

  const { data, error } = await (supabase as any)
    .from('user_locations')
    .insert({
      user_id: user.id,
      location,
      postcode,
      lat,
      lng,
      is_primary: false,
    })
    .select('id, location, postcode, lat, lng, created_at')
    .single();

  if (error) {
    console.error('[profile/locations] POST error:', error);
    return NextResponse.json({ error: 'Failed to add location' }, { status: 500 });
  }

  return NextResponse.json({ location: data });
}
