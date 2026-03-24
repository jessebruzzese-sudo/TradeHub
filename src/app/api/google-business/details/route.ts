import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'Missing Google Places API key' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const placeId = String(searchParams.get('placeId') || '').trim();
  if (!placeId) {
    return NextResponse.json({ ok: false, error: 'Missing placeId' }, { status: 400 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,formatted_address,rating,user_ratings_total,url');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.result || (data?.status && data.status !== 'OK')) {
    return NextResponse.json({ ok: false, error: 'Could not load business details' }, { status: 502 });
  }

  const result = data.result;
  return NextResponse.json({
    placeId: result?.place_id ? String(result.place_id) : placeId,
    name: result?.name ? String(result.name) : '',
    address: result?.formatted_address ? String(result.formatted_address) : '',
    rating: typeof result?.rating === 'number' ? result.rating : null,
    reviewCount: typeof result?.user_ratings_total === 'number' ? result.user_ratings_total : null,
    googleMapsUrl: result?.url ? String(result.url) : null,
  });
}
