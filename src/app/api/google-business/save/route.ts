import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type SavePayload = {
  placeId?: string | null;
  name?: string | null;
  address?: string | null;
  googleMapsUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
};

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SavePayload;
  const placeId = String(body?.placeId || '').trim();
  const name = String(body?.name || '').trim();
  const address = String(body?.address || '').trim();
  const googleMapsUrl = String(body?.googleMapsUrl || '').trim();
  const rating = body?.rating == null ? null : Number(body.rating);
  const reviewCount = body?.reviewCount == null ? null : Number(body.reviewCount);

  if (!placeId || !name) {
    return NextResponse.json({ error: 'Missing Google listing identity' }, { status: 400 });
  }
  if (rating != null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }
  if (reviewCount != null && (!Number.isFinite(reviewCount) || reviewCount < 0)) {
    return NextResponse.json({ error: 'Invalid review count' }, { status: 400 });
  }

  const patch = {
    google_business_url: googleMapsUrl || null,
    google_business_name: name,
    google_business_address: address || null,
    google_place_id: placeId,
    google_business_rating: rating,
    google_business_review_count: reviewCount,
    google_rating: rating,
    google_review_count: reviewCount,
    google_listing_claimed_by_user: true,
  };

  const { error } = await (supabase as any).from('users').update(patch).eq('id', user.id);
  if (error) return NextResponse.json({ error: 'Failed to save Google listing' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
