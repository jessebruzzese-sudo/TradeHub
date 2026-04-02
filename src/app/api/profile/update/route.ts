import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier } from '@/lib/plan-limits';
import {
  getUserClaimToggleNextStatus,
  normalizeGoogleListingVerificationStatus,
  shouldResetGoogleVerification,
} from '@/lib/google-business';
import { normalizeAbnForDb } from '@/lib/abn-normalize';

export const dynamic = 'force-dynamic';

type DbPatch = Record<string, unknown>;

const locationKeys = new Set(['location', 'postcode', 'location_lat', 'location_lng']);
const blockedUserWritableGoogleFields = new Set([
  'google_listing_verified_at',
  'google_listing_verified_by',
  'google_listing_verification_method',
  'google_listing_rejection_reason',
]);

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isValidCoordPair = (lat: unknown, lng: unknown) =>
  isFiniteNumber(lat) && isFiniteNumber(lng) && !(Number(lat) === 0 && Number(lng) === 0);

function normalizeLocationPatch(input: DbPatch): DbPatch {
  const patch: DbPatch = { ...input };

  if ('location' in patch && typeof patch.location === 'string') {
    patch.location = patch.location.trim() || null;
  }
  if ('postcode' in patch && typeof patch.postcode === 'string') {
    patch.postcode = patch.postcode.trim() || null;
  }

  const lat = patch.location_lat;
  const lng = patch.location_lng;
  if ('location_lat' in patch || 'location_lng' in patch) {
    if (!isValidCoordPair(lat, lng)) {
      patch.location_lat = null;
      patch.location_lng = null;
    }
  }

  return patch;
}

function sanitizeUserPatch(input: DbPatch): DbPatch {
  const patch: DbPatch = { ...input };
  for (const key of blockedUserWritableGoogleFields) {
    if (key in patch) delete patch[key];
  }
  if ('google_listing_verification_status' in patch) {
    delete patch.google_listing_verification_status;
  }
  return patch;
}

function hasPrimaryLocationChange(patch: DbPatch, current: Record<string, unknown>) {
  for (const key of locationKeys) {
    if (!(key in patch)) continue;
    const incoming = patch[key] ?? null;
    const existing = current[key] ?? null;
    if (incoming !== existing) return true;
  }
  return false;
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
  const rawPatch = body?.patch && typeof body.patch === 'object' ? (body.patch as DbPatch) : null;
  if (!rawPatch || Object.keys(rawPatch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const patch = normalizeLocationPatch(sanitizeUserPatch(rawPatch));

  const { data: dbUser, error: userError } = await (supabase as any)
    .from('users')
    .select('id, plan, subscription_status, complimentary_premium_until, location, postcode, location_lat, location_lng, google_business_url, google_business_name, google_place_id, google_listing_verification_status, google_listing_claimed_by_user')
    .eq('id', user.id)
    .maybeSingle();

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  if (getTier(dbUser) !== 'premium' && hasPrimaryLocationChange(patch, dbUser)) {
    return NextResponse.json(
      { error: 'Changing primary location requires Premium' },
      { status: 403 }
    );
  }

  if ('google_rating' in patch && patch.google_rating != null) {
    const rating = Number(patch.google_rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'Google rating must be between 0 and 5' }, { status: 400 });
    }
  }
  if ('google_business_rating' in patch && patch.google_business_rating != null) {
    const rating = Number(patch.google_business_rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'Google rating must be between 0 and 5' }, { status: 400 });
    }
  }
  if ('google_review_count' in patch && patch.google_review_count != null) {
    const count = Number(patch.google_review_count);
    if (!Number.isFinite(count) || count < 0) {
      return NextResponse.json({ error: 'Google review count must be zero or greater' }, { status: 400 });
    }
  }
  if ('google_business_review_count' in patch && patch.google_business_review_count != null) {
    const count = Number(patch.google_business_review_count);
    if (!Number.isFinite(count) || count < 0) {
      return NextResponse.json({ error: 'Google review count must be zero or greater' }, { status: 400 });
    }
  }

  const currentStatus = normalizeGoogleListingVerificationStatus(dbUser.google_listing_verification_status);
  const hasClaimPatch = 'google_listing_claimed_by_user' in patch;
  const nextClaimedByUser = hasClaimPatch
    ? patch.google_listing_claimed_by_user === true
    : dbUser.google_listing_claimed_by_user === true;
  if (hasClaimPatch) {
    patch.google_listing_claimed_by_user = nextClaimedByUser;
  }

  if (hasClaimPatch) {
    const nextStatus = getUserClaimToggleNextStatus(currentStatus, nextClaimedByUser);
    if (nextStatus !== currentStatus) {
      patch.google_listing_verification_status = nextStatus;
    }
    if (nextStatus === 'UNVERIFIED') {
      patch.google_listing_verified_at = null;
      patch.google_listing_verified_by = null;
      patch.google_listing_verification_method = null;
      patch.google_listing_rejection_reason = null;
    } else if (nextStatus === 'SELF_CONFIRMED') {
      patch.google_listing_rejection_reason = null;
    } else if (!nextClaimedByUser && currentStatus === 'VERIFIED') {
      // Users cannot remove platform verification directly.
      patch.google_listing_claimed_by_user = dbUser.google_listing_claimed_by_user === true;
    }
  }

  if (shouldResetGoogleVerification(dbUser, patch)) {
    patch.google_listing_verification_status = 'SELF_CONFIRMED';
    patch.google_listing_verified_at = null;
    patch.google_listing_verified_by = null;
    patch.google_listing_verification_method = null;
    patch.google_listing_rejection_reason = null;
    patch.google_listing_claimed_by_user = true;
  }

  if ('abn' in patch) {
    const normalized = normalizeAbnForDb(patch.abn as string | null | undefined);
    patch.abn = normalized;
    if (normalized == null) {
      patch.abn_status = 'UNVERIFIED';
      patch.abn_verified = false;
      patch.abn_verified_at = null;
    }
  }

  const { error: updateError } = await (supabase as any).from('users').update(patch).eq('id', user.id);
  if (updateError) {
    // Surface useful details for debugging (safe: does not include secrets).
    return NextResponse.json(
      {
        error: 'Failed to update profile',
        details: {
          code: (updateError as any).code ?? null,
          message: (updateError as any).message ?? String(updateError),
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
