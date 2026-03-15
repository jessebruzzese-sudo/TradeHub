/**
 * Geocode suburb + postcode to lat/lng.
 * Used when applying AI-generated tender drafts or manual suburb entry without place_id.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const address = (searchParams.get('address') || searchParams.get('q') || '').trim();
  if (!address || address.length < 3) {
    return NextResponse.json({ ok: false, error: 'Missing or invalid address' }, { status: 400 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', `${address}, Australia`);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));

  const result = data?.results?.[0];
  if (!result?.geometry?.location) {
    return NextResponse.json({
      ok: false,
      error: 'No results',
      lat: null,
      lng: null,
    });
  }

  const lat = result.geometry.location.lat ?? null;
  const lng = result.geometry.location.lng ?? null;

  return NextResponse.json({
    ok: true,
    lat,
    lng,
    formatted_address: result.formatted_address || null,
  });
}
