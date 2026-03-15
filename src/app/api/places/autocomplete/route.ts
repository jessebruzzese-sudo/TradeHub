import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const input = (searchParams.get('input') || '').trim();

  if (input.length < 2) return NextResponse.json({ ok: true, status: 'OK', predictions: [] });

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('components', 'country:au');
  url.searchParams.set('types', 'geocode');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));

  const predictions = (data.predictions || []).map((p: any) => ({
    description: p.description,
    place_id: p.place_id,
    structured_formatting: p.structured_formatting,
  }));

  const hasPostcode = (desc: string) => /\b\d{4}\b/.test(desc || '');
  predictions.sort((a: any, b: any) => {
    const aHas = hasPostcode(a.description);
    const bHas = hasPostcode(b.description);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  return NextResponse.json({
    ok: true,
    status: data.status,
    predictions,
  });
}
