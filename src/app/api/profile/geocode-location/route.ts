/**
 * Geocode the authenticated user's location+postcode and persist location_lat /
 * location_lng. Used to backfill users who signed up before we captured coords.
 */
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from('users')
    .select('id, location, postcode, location_lat, location_lng')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
  }

  const hasCoords = row.location_lat != null && row.location_lng != null;
  if (hasCoords) {
    return NextResponse.json({ ok: true, skipped: 'already_has_coords' });
  }

  const location = (row.location ?? '').trim();
  const postcode = (row.postcode ?? '').trim();
  if (!location) {
    return NextResponse.json({ error: 'No location to geocode' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Geocoding not configured' }, { status: 500 });
  }

  const address = postcode ? `${location}, ${postcode}, Australia` : `${location}, Australia`;
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  const result = data?.results?.[0];
  if (!result?.geometry?.location) {
    return NextResponse.json({ error: 'No geocode results', lat: null, lng: null }, { status: 400 });
  }

  const lat = result.geometry.location.lat ?? null;
  const lng = result.geometry.location.lng ?? null;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid geocode result' }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({
      location_lat: lat,
      location_lng: lng,
    })
    .eq('id', user.id);

  if (updateErr) {
    console.error('[geocode-location] update error:', updateErr);
    return NextResponse.json({ error: 'Failed to save coordinates' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lat, lng });
}
