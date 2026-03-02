import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    return NextResponse.json({ ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', 'Bulleen');
  url.searchParams.set('components', 'country:au');
  url.searchParams.set('types', 'geocode');
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    return NextResponse.json({
      ok: true,
      status: data.status,
      firstPrediction: data?.predictions?.[0] ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({
      ok: false,
      error: message,
    });
  }
}
