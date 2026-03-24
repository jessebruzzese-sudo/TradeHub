import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'Missing Google Places API key' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ error: 'Missing or invalid q' }, { status: 400 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', q);
  url.searchParams.set('types', 'establishment');
  url.searchParams.set('components', 'country:au');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data?.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
    return NextResponse.json({ ok: false, error: 'Google business search failed' }, { status: 502 });
  }

  const predictions = Array.isArray(data?.predictions)
    ? data.predictions.slice(0, 8).map((item: any) => ({
        placeId: item?.place_id ? String(item.place_id) : '',
        description: item?.description ? String(item.description) : '',
      }))
    : [];

  return NextResponse.json({ predictions: predictions.filter((p: any) => !!p.placeId) });
}
