import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const placeId = (searchParams.get('place_id') || '').trim();
  if (!placeId) return NextResponse.json({ ok: false, error: 'Missing place_id' }, { status: 400 });

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'address_components,geometry,name,formatted_address');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));

  const comps = data?.result?.address_components || [];
  const getComp = (type: string) => comps.find((c: any) => (c.types || []).includes(type));

  const postcode = getComp('postal_code')?.long_name || '';
  const suburb =
    getComp('locality')?.long_name ||
    getComp('sublocality')?.long_name ||
    getComp('postal_town')?.long_name ||
    data?.result?.name ||
    '';

  const state = getComp('administrative_area_level_1')?.short_name || '';
  const lat = data?.result?.geometry?.location?.lat ?? null;
  const lng = data?.result?.geometry?.location?.lng ?? null;

  return NextResponse.json({
    ok: true,
    status: data.status,
    suburb,
    state,
    postcode,
    lat,
    lng,
    formatted_address: data?.result?.formatted_address || '',
  });
}
