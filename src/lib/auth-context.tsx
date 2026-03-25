'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { useActivityPing } from '@/hooks/useActivityPing';
import {
  hasSubcontractorPremium,
  hasBuilderPremium,
  hasContractorPremium,
  canChangePrimaryTrade,
} from '@/lib/capability-utils';
import { normalizeGoogleListingVerificationStatus } from '@/lib/google-business';
import { normalizeTrade, normalizeTradesList } from '@/lib/trades/normalizeTrade';
import { getDisplayTradeListFromUserRow, splitSelectedTrades } from '@/lib/trades/user-trades';
import {
  normalizeAbnForDb,
  userMetadataIndicatesAbrVerified,
  abrVerifiedAtFromUserMetadata,
} from '@/lib/abn-normalize';
import { hasValidABN } from '@/lib/abn-utils';

export async function ensureProfileRow(supabase: any, user: any) {
  if (!user?.id) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaAbn = normalizeAbnForDb(meta.abn != null ? String(meta.abn) : '');
  const metaAbr = userMetadataIndicatesAbrVerified(meta);
  const metaVerifiedAt = abrVerifiedAtFromUserMetadata(meta);
  const metaBiz =
    String(meta.business_name ?? meta.businessName ?? '')
      .trim() || null;
  const metaEntity =
    String(meta.abn_entity_name ?? meta.abnEntityName ?? '')
      .trim() || null;

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select(
      'id, location, postcode, location_lat, location_lng, base_lat, base_lng, primary_trade, additional_trades, abn, abn_status, abn_verified, abn_verified_at, business_name, is_public_profile'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('ensureProfileRow fetch error', fetchError);
    return;
  }
  const metaLocation = String(meta.location ?? '').trim() || null;
  const metaPostcode = String(meta.postcode ?? '').trim() || null;
  const metaLocationLatRaw = meta.locationLat ?? meta.location_lat;
  const metaLocationLngRaw = meta.locationLng ?? meta.location_lng;
  const metaLocationLat =
    typeof metaLocationLatRaw === 'number' && Number.isFinite(metaLocationLatRaw)
      ? metaLocationLatRaw
      : null;
  const metaLocationLng =
    typeof metaLocationLngRaw === 'number' && Number.isFinite(metaLocationLngRaw)
      ? metaLocationLngRaw
      : null;
  const metaHasValidCoords = hasValidCoordinatePair(metaLocationLat, metaLocationLng);
  const emailFallback = user.email ?? `${String(user.id)}@unknown.local`;
  const nameFallback = String(meta.full_name ?? meta.name ?? emailFallback).trim() || emailFallback;
  const roleRaw = String(meta.role ?? '').trim().toLowerCase();
  const roleFallback =
    roleRaw === 'admin' || roleRaw === 'subcontractor' || roleRaw === 'contractor'
      ? roleRaw
      : 'contractor';
  const trustStatusRaw = String(meta.trust_status ?? meta.trustStatus ?? '').trim().toLowerCase();
  const trustStatusFallback =
    trustStatusRaw === 'approved' || trustStatusRaw === 'verified' || trustStatusRaw === 'pending'
      ? trustStatusRaw
      : 'pending';

  // Create row only if missing
  if (!existing?.id) {
    const insertRow: Record<string, unknown> = {
      id: user.id,
      email: emailFallback,
      name: nameFallback,
      role: roleFallback,
      trust_status: trustStatusFallback,
      rating: 0,
      completed_jobs: 0,
      location: metaLocation,
      postcode: metaPostcode,
      location_lat: metaHasValidCoords ? metaLocationLat : null,
      location_lng: metaHasValidCoords ? metaLocationLng : null,
      base_lat: metaHasValidCoords ? metaLocationLat : null,
      base_lng: metaHasValidCoords ? metaLocationLng : null,
      ...(() => {
        const list = Array.isArray(meta.trade_categories)
          ? (meta.trade_categories as unknown[]).map(String).map((t) => t.trim()).filter(Boolean)
          : Array.isArray(meta.trades)
            ? (meta.trades as unknown[]).map(String).map((t) => t.trim()).filter(Boolean)
            : meta.primaryTrade || meta.primary_trade
              ? [String(meta.primaryTrade ?? meta.primary_trade).trim()].filter(Boolean)
              : [];
        const s = splitSelectedTrades(list, true);
        return {
          primary_trade: s.primary_trade,
          additional_trades: s.additional_trades,
        };
      })(),
      business_name: metaBiz,
    };

    if (metaAbn) {
      insertRow.abn = metaAbn;
      if (metaAbr) {
        insertRow.abn_status = 'VERIFIED';
        insertRow.abn_verified = true;
        insertRow.abn_verified_at = metaVerifiedAt ?? new Date().toISOString();
        if (metaEntity) insertRow.business_name = metaEntity;
        else if (metaBiz) insertRow.business_name = metaBiz;
      } else {
        insertRow.abn_status = 'UNVERIFIED';
        insertRow.abn_verified = false;
        insertRow.abn_verified_at = null;
      }
    }

    const { error: insertError } = await supabase.from('users').insert(insertRow);

    if (insertError) {
      // If row was created elsewhere between fetch and insert, continue to ABN backfill.
      if (insertError.code !== '23505') {
        console.error('ensureProfileRow insert error', insertError);
        return;
      }
    }
  }

  // --- ABN Persistence / Backfill (runs even if row already existed) ---
  // Fetch latest row state before deciding if we need to backfill
  const { data: rowNow } = await supabase
    .from('users')
    .select(
      'id, location, postcode, location_lat, location_lng, base_lat, base_lng, primary_trade, additional_trades, abn, abn_status, abn_verified, abn_verified_at, business_name, is_public_profile'
    )
    .eq('id', user.id)
    .maybeSingle();

  const metaPrimaryTrade =
    String(meta.primaryTrade ?? meta.primary_trade ?? '').trim() ||
    (Array.isArray(meta.trade_categories) ? String(meta.trade_categories[0] ?? '').trim() : '') ||
    (Array.isArray(meta.trades) ? String(meta.trades[0] ?? '').trim() : '');
  const metaTrades = Array.isArray(meta.trade_categories)
    ? (meta.trade_categories as unknown[]).map(String).map((t) => t.trim()).filter(Boolean)
    : Array.isArray(meta.trades)
      ? (meta.trades as unknown[]).map(String).map((t) => t.trim()).filter(Boolean)
      : metaPrimaryTrade
        ? [metaPrimaryTrade]
        : [];
  const metaCoordsValid = metaHasValidCoords;

  // Backfill trade fields when trigger-created row missed them (e.g. metadata key mismatch during signup).
  const rowPrimaryTrade = String((rowNow as any)?.primary_trade ?? '').trim();
  const rowAdditional = Array.isArray((rowNow as any)?.additional_trades)
    ? ((rowNow as any).additional_trades as unknown[]).map(String).map((t) => t.trim()).filter(Boolean)
    : [];
  const rowHasCanonicalTrade = Boolean(rowPrimaryTrade) || rowAdditional.length > 0;
  if ((!rowPrimaryTrade && metaPrimaryTrade) || (!rowHasCanonicalTrade && metaTrades.length > 0)) {
    const list = metaTrades.length > 0 ? metaTrades : metaPrimaryTrade ? [metaPrimaryTrade] : [];
    const s = splitSelectedTrades(list, true);
    const tradeUpdate: Record<string, unknown> = {
      primary_trade: s.primary_trade,
      additional_trades: s.additional_trades,
    };
    const { error: tradeBackfillErr } = await supabase.from('users').update(tradeUpdate).eq('id', user.id);
    if (tradeBackfillErr) console.error('ensureProfileRow trade backfill error', tradeBackfillErr);
  }
  const rowHasCoords =
    Number.isFinite(Number((rowNow as any)?.location_lat)) &&
    Number.isFinite(Number((rowNow as any)?.location_lng));
  if (!rowHasCoords && metaCoordsValid) {
    const locationBackfill: Record<string, unknown> = {
      location_lat: metaLocationLat,
      location_lng: metaLocationLng,
      base_lat: metaLocationLat,
      base_lng: metaLocationLng,
    };
    if (metaLocation && !(rowNow as any)?.location) locationBackfill.location = metaLocation;
    if (metaPostcode && !(rowNow as any)?.postcode) locationBackfill.postcode = metaPostcode;
    const { error: locBackfillErr } = await supabase
      .from('users')
      .update(locationBackfill)
      .eq('id', user.id);
    if (locBackfillErr) console.error('ensureProfileRow location backfill error', locBackfillErr);
  }

  if (!metaAbn) {
    return;
  }

  const dbStatus = String(rowNow?.abn_status || '').toUpperCase();
  const dbAbn = normalizeAbnForDb(rowNow?.abn as string | undefined);
  const dbLooksVerified = hasValidABN({
    abn: rowNow?.abn,
    abn_status: rowNow?.abn_status,
  });

  if (dbAbn && dbAbn !== metaAbn) {
    return;
  }

  if (metaAbr) {
    const blockMetaVerify = dbStatus === 'REJECTED' || dbStatus === 'PENDING';
    if (!dbLooksVerified && !blockMetaVerify) {
      const abnUpdate: Record<string, unknown> = {
        abn: metaAbn,
        abn_status: 'VERIFIED',
        abn_verified: true,
        abn_verified_at: metaVerifiedAt ?? new Date().toISOString(),
      };
      if (metaEntity) abnUpdate.business_name = metaEntity;
      else if (metaBiz && !rowNow?.business_name) abnUpdate.business_name = metaBiz;
      const { error: upErr } = await supabase.from('users').update(abnUpdate).eq('id', user.id);
      if (upErr) console.error('ensureProfileRow ABN verified backfill error', upErr);
    }
    return;
  }

  if (!dbAbn) {
    const abnUpdate: Record<string, unknown> = {
      abn: metaAbn,
      abn_status: 'UNVERIFIED',
      abn_verified: false,
      abn_verified_at: null,
    };
    if (metaBiz && !rowNow?.business_name) abnUpdate.business_name = metaBiz;
    const { error: upErr } = await supabase.from('users').update(abnUpdate).eq('id', user.id);
    if (upErr) console.error('ensureProfileRow ABN unverified persist error', upErr);
  }
}

const numOrNull = (v: unknown): number | null => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const isValidDiscoveryCoord = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const hasValidCoordinatePair = (lat: unknown, lng: unknown): lat is number =>
  isValidDiscoveryCoord(lat) &&
  isValidDiscoveryCoord(lng) &&
  !(Number(lat) === 0 && Number(lng) === 0);

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type Availability = Record<Day, boolean>;

type DbUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  plan?: string | null;
  role: string | null;
  is_admin?: boolean | null;
  trust_status: string | null;
  avatar: string | null;
  cover_url: string | null;
  bio: string | null;
  rating: number | null;
  reliability_rating: number | null;
  primary_trade?: string | null;
  business_name?: string | null;
  abn?: string | null;
  abn_status?: string | null;
  abn_verified_at?: string | null;
  abn_verified?: boolean | null;
  show_abn_on_profile?: boolean | null;
  show_business_name_on_profile?: boolean | null;
  /** Legacy jsonb column; app reads via getDisplayTradeListFromUserRow fallback only. */
  trades?: any;
  // Subscription / premium (from users table)
  is_premium?: boolean | null;
  active_plan?: string | null;
  subscription_status?: string | null;
  subscription_renews_at?: string | null;
  subscription_started_at?: string | null;
  subscription_canceled_at?: string | null;
  complimentary_premium_until?: string | null;
  premium_until?: string | null;
  additional_trades_unlocked?: boolean | null;
  additional_trades?: string[] | null;
  search_location?: string | null;
  search_postcode?: string | null;
  search_lat?: number | null;
  search_lng?: number | null;
  base_lat?: number | null;
  base_lng?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  radius?: number | null;
  preferred_radius_km?: number | null;
  subcontractor_preferred_radius_km?: number | null;
  is_public_profile?: boolean | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  mini_bio?: string | null;
  phone?: string | null;
  show_phone_on_profile?: boolean | null;
  show_email_on_profile?: boolean | null;
  pricing_type?: string | null;
  pricing_amount?: number | null;
  show_pricing_on_profile?: boolean | null;
  show_pricing_in_listings?: boolean | null;
  last_active_at?: string | null;
  google_business_url?: string | null;
  google_business_name?: string | null;
  google_business_address?: string | null;
  google_place_id?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_listing_claimed_by_user?: boolean | null;
  google_listing_verification_status?: string | null;
  google_listing_verified_at?: string | null;
  google_listing_verification_method?: string | null;
  google_listing_verified_by?: string | null;
  google_listing_rejection_reason?: string | null;
};

export type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  plan?: 'free' | 'premium' | null;
  /** Role is NOT used for permissions; admin only via isAdmin(). Kept for UI/copy. */
  role?: string | null;
  is_admin?: boolean | null;

  trustStatus?: string | null;

  avatar?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  miniBio?: string | null;
  phone?: string | null;
  showPhoneOnProfile?: boolean | null;
  showEmailOnProfile?: boolean | null;

  rating?: number | null;
  reliabilityRating?: number | null;

  // App-expected extras (not in DB yet)
  primaryTrade?: string | null;
  location?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;

  abn?: string | null;
  businessName?: string | null;
  abnStatus?: string | null;
  abnVerified?: boolean;
  abnVerifiedAt?: string | null;
  abnEntityName?: string | null;
  showAbnOnProfile?: boolean;
  showBusinessNameOnProfile?: boolean;

  trades?: string[];
  additionalTrades?: string[];

  completedJobs?: number | null;
  memberSince?: string | null;
  createdAt?: string | null;

  /**
   * From DB: premium/capabilities or explicit admin-grant. Do NOT auto-derive from additionalTrades.
   */
  additionalTradesUnlocked?: boolean;

  // Subscription / premium (from DB)
  isPremium?: boolean | null;
  activePlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionRenewsAt?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionCanceledAt?: string | null;
  complimentaryPremiumUntil?: string | null;
  premiumUntil?: string | null;

  // Premium "search-from" location (from DB)
  searchLocation?: string | null;
  searchPostcode?: string | null;
  searchLat?: number | null;
  searchLng?: number | null;

  /** When true, profile appears in Trades near you discovery. */
  isPublicProfile?: boolean;
  /** Snake-case alias for compatibility. */
  is_public_profile?: boolean | null;

  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  youtube?: string | null;

  /** Optional public pricing. Only shown when user enables visibility. */
  pricingType?: string | null;
  pricingAmount?: number | null;
  showPricingOnProfile?: boolean;
  showPricingInListings?: boolean;

  /** Premium: receive alerts when new jobs matching trade are listed */
  receiveTradeAlerts?: boolean;

  profileStrengthScore?: number | null;
  profileStrengthBand?: string | null;
  googleBusinessUrl?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleBusinessName?: string | null;
  googleBusinessAddress?: string | null;
  googlePlaceId?: string | null;
  googleListingClaimedByUser?: boolean;
  googleListingVerificationStatus?: string | null;
  googleListingVerifiedAt?: string | null;
  googleListingVerificationMethod?: string | null;
  googleListingVerifiedBy?: string | null;
  googleListingRejectionReason?: string | null;
  lastActiveAt?: string | null;
}

type SignupExtras = {
  businessName?: string;
  abn?: string;
  abnEntityName?: string;
  abnEntityType?: string;
  abnVerified?: boolean;
  location?: string;
  postcode?: string;
  locationLat?: number;
  locationLng?: number;
  availability?: Record<string, boolean>;
  role?: string;
  trades?: string[];
  additionalTrades?: string[];
  /** Full trade selection (1 for free, unlimited for premium). TODO: migrate backend to use this. */
  tradeCategories?: string[];
  /** Legal/full name (stored in metadata only; display name goes via `name` param). */
  legal_name?: string;
};

type UpdateUserInput = Partial<
  Pick<
    CurrentUser,
    | 'name'
    | 'role'
    | 'bio'
    | 'avatar'
    | 'coverUrl'
    | 'primaryTrade'
    | 'location'
    | 'postcode'
    | 'businessName'
    | 'abn'
    | 'abnStatus'
    | 'showAbnOnProfile'
    | 'showBusinessNameOnProfile'
    | 'trades'
    | 'additionalTrades'
    | 'searchLocation'
    | 'searchPostcode'
    | 'searchLat'
    | 'searchLng'
    | 'isPublicProfile'
    | 'website'
    | 'instagram'
    | 'facebook'
    | 'linkedin'
    | 'tiktok'
    | 'youtube'
    | 'receiveTradeAlerts'
    | 'googleBusinessUrl'
    | 'googleBusinessName'
    | 'googleBusinessAddress'
    | 'googlePlaceId'
    | 'googleRating'
    | 'googleReviewCount'
    | 'googleListingClaimedByUser'
    | 'googleListingVerificationStatus'
  >
> & {
  google_business_url?: string | null;
  google_business_name?: string | null;
  google_business_address?: string | null;
  google_place_id?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_listing_claimed_by_user?: boolean;
  google_listing_verification_status?: string | null;
};

type AuthCtx = {
  session: Session | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    primaryTrade: string,
    extras?: SignupExtras
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: UpdateUserInput) => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

function normalizeSubscriptionStatus(s?: string | null): string | null {
  const v = (s || '').trim().toUpperCase();
  if (!v) return null;
  if (['NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED'].includes(v)) return v;
  return v as string;
}

function normalizeActivePlan(s?: string | null): string | null {
  const v = (s || '').trim().toUpperCase();
  if (!v) return null;
  if (['NONE', 'BUSINESS_PRO_20', 'SUBCONTRACTOR_PRO_10', 'ALL_ACCESS_PRO_26'].includes(v)) return v;
  return v as string;
}

function mapDbToUi(row: DbUserRow): CurrentUser {
  const plan = String((row as any).plan || '').trim().toLowerCase();
  const isPlanPremium = plan === 'premium';
  return {
    id: row.id,
    email: row.email ?? null,
    name: row.name ?? null,
    role: row.role ?? null,
    is_admin: row.is_admin ?? false,
    trustStatus: row.trust_status ?? null,
    avatar: row.avatar ?? null,
    coverUrl: row.cover_url ?? null,
    bio: row.bio ?? null,
    miniBio: (row as any).mini_bio ?? null,
    rating: row.rating ?? null,
    reliabilityRating: row.reliability_rating ?? null,

    primaryTrade: row.primary_trade ? normalizeTrade(row.primary_trade) : null,
    location: (row as any).location ?? null,
    postcode: (row as any).postcode ?? null,
    lat: (row as any).location_lat != null ? Number((row as any).location_lat) : (row.search_lat != null ? Number(row.search_lat) : null),
    lng: (row as any).location_lng != null ? Number((row as any).location_lng) : (row.search_lng != null ? Number(row.search_lng) : null),
    abn: row.abn ?? null,
    businessName: row.business_name ?? null,
    abnStatus: (row.abn_status ? (String(row.abn_status).toUpperCase() as CurrentUser['abnStatus']) : null),
    abnVerified: hasValidABN({
      abn: row.abn,
      abn_status: row.abn_status,
    }),
    abnVerifiedAt: row.abn_verified_at ?? null,
    abnEntityName: row.business_name ?? null,
    showAbnOnProfile: row.show_abn_on_profile ?? false,
    showBusinessNameOnProfile: row.show_business_name_on_profile ?? false,
    trades: getDisplayTradeListFromUserRow(row as any),
    additionalTrades: Array.isArray((row as any).additional_trades)
      ? normalizeTradesList((row as any).additional_trades as string[])
      : undefined,
    completedJobs: null,
    memberSince: null,
    createdAt: null,

    additionalTradesUnlocked: row.additional_trades_unlocked === true,

    plan: plan === 'premium' || plan === 'free' ? (plan as 'free' | 'premium') : null,
    isPremium: isPlanPremium || row.is_premium === true,
    activePlan: normalizeActivePlan(row.active_plan) ?? null,
    subscriptionStatus: normalizeSubscriptionStatus(row.subscription_status) ?? null,
    subscriptionRenewsAt: row.subscription_renews_at ?? null,
    subscriptionStartedAt: row.subscription_started_at ?? null,
    subscriptionCanceledAt: row.subscription_canceled_at ?? null,
    complimentaryPremiumUntil: row.complimentary_premium_until ?? null,
    premiumUntil: row.premium_until ?? null,

    searchLocation: row.search_location ?? null,
    searchPostcode: row.search_postcode ?? null,
    searchLat: row.search_lat != null ? Number(row.search_lat) : null,
    searchLng: row.search_lng != null ? Number(row.search_lng) : null,

    isPublicProfile: row.is_public_profile ?? true,
    is_public_profile: row.is_public_profile ?? true,

    website: row.website ?? null,
    instagram: row.instagram ?? null,
    facebook: row.facebook ?? null,
    linkedin: row.linkedin ?? null,
    tiktok: row.tiktok ?? null,
    youtube: row.youtube ?? null,

    phone: (row as any).phone ?? null,
    showPhoneOnProfile: (row as any).show_phone_on_profile === true,
    showEmailOnProfile: (row as any).show_email_on_profile === true,

    pricingType: (row as any).pricing_type ?? null,
    pricingAmount: (row as any).pricing_amount != null ? Number((row as any).pricing_amount) : null,
    showPricingOnProfile: (row as any).show_pricing_on_profile === true,
    showPricingInListings: (row as any).show_pricing_in_listings === true,

    receiveTradeAlerts: (row as any).subcontractor_work_alerts_enabled === true,

    profileStrengthScore:
      (row as any).profile_strength_score != null ? Number((row as any).profile_strength_score) : null,
    profileStrengthBand: (row as any).profile_strength_band ?? null,
    googleBusinessUrl: (row as any).google_business_url ?? null,
    googleBusinessName: (row as any).google_business_name ?? null,
    googleBusinessAddress: (row as any).google_business_address ?? null,
    googlePlaceId: (row as any).google_place_id ?? null,
    googleRating:
      (row as any).google_business_rating != null
        ? Number((row as any).google_business_rating)
        : (row as any).google_rating != null
          ? Number((row as any).google_rating)
          : null,
    googleReviewCount:
      (row as any).google_business_review_count != null
        ? Number((row as any).google_business_review_count)
        : (row as any).google_review_count != null
          ? Number((row as any).google_review_count)
          : null,
    googleListingClaimedByUser: (row as any).google_listing_claimed_by_user === true,
    googleListingVerificationStatus: normalizeGoogleListingVerificationStatus(
      (row as any).google_listing_verification_status
    ),
    googleListingVerifiedAt: (row as any).google_listing_verified_at ?? null,
    googleListingVerificationMethod: (row as any).google_listing_verification_method ?? null,
    googleListingVerifiedBy: (row as any).google_listing_verified_by ?? null,
    googleListingRejectionReason: (row as any).google_listing_rejection_reason ?? null,
    lastActiveAt: (row as any).last_active_at ?? null,
  };
}

function buildFallbackCurrentUser(user: Pick<User, 'id' | 'email' | 'user_metadata'>): CurrentUser {
  const meta = (user.user_metadata as Record<string, unknown> | null) ?? {};
  const roleRaw = String(meta.role ?? '').trim().toLowerCase();
  const role =
    roleRaw === 'admin' || roleRaw === 'subcontractor' || roleRaw === 'contractor'
      ? roleRaw
      : 'contractor';
  const trustRaw = String(meta.trust_status ?? meta.trustStatus ?? '').trim().toLowerCase();
  const trustStatus =
    trustRaw === 'approved' || trustRaw === 'verified' || trustRaw === 'pending'
      ? trustRaw
      : 'pending';
  const primaryTradeFromMeta =
    (meta.primaryTrade as string | undefined) ??
    (meta.primary_trade as string | undefined) ??
    null;
  const trades = normalizeTradesList(
    Array.isArray(meta.trade_categories)
      ? (meta.trade_categories as unknown[]).map(String).filter(Boolean)
      : Array.isArray(meta.trades)
        ? (meta.trades as unknown[]).map(String).filter(Boolean)
        : primaryTradeFromMeta
          ? [primaryTradeFromMeta]
          : []
  );
  const primaryTrade =
    (primaryTradeFromMeta ? normalizeTrade(primaryTradeFromMeta) : null) ?? trades[0] ?? null;

  const fallbackAbn = normalizeAbnForDb(meta.abn != null ? String(meta.abn) : '');
  const fallbackAbr = userMetadataIndicatesAbrVerified(meta);
  const fallbackLocation = String(meta.location ?? '').trim() || null;
  const fallbackPostcode = String(meta.postcode ?? '').trim() || null;
  const latRaw = meta.locationLat ?? meta.location_lat;
  const lngRaw = meta.locationLng ?? meta.location_lng;
  const fallbackLat =
    typeof latRaw === 'number' && Number.isFinite(latRaw) ? latRaw : null;
  const fallbackLng =
    typeof lngRaw === 'number' && Number.isFinite(lngRaw) ? lngRaw : null;
  const fallbackCoordsOk = hasValidCoordinatePair(fallbackLat, fallbackLng);

  return {
    id: user.id,
    email: user.email ?? null,
    name: String(meta.full_name ?? meta.name ?? user.email ?? '').trim() || null,
    role,
    trustStatus,
    primaryTrade,
    trades,
    additionalTrades: [],
    additionalTradesUnlocked: false,
    abn: fallbackAbn,
    abnStatus: fallbackAbn ? (fallbackAbr ? 'VERIFIED' : 'UNVERIFIED') : null,
    abnVerified: hasValidABN({
      abn: fallbackAbn,
      abnStatus: fallbackAbn ? (fallbackAbr ? 'VERIFIED' : 'UNVERIFIED') : null,
    }),
    businessName:
      (meta.businessName as string | undefined) ??
      (meta.business_name as string | undefined) ??
      null,
    location: fallbackLocation,
    postcode: fallbackPostcode,
    lat: fallbackCoordsOk ? fallbackLat : null,
    lng: fallbackCoordsOk ? fallbackLng : null,
    isPublicProfile: true,
    is_public_profile: true,
    plan: null,
    isPremium: false,
    receiveTradeAlerts: false,
  };
}

function mapUiPatchToDb(patch: UpdateUserInput): Partial<DbUserRow> {
  const out: Partial<DbUserRow> = {};
  if (patch.name !== undefined) out.name = patch.name ?? null;
  if (patch.role !== undefined) out.role = patch.role ?? null;
  if (patch.bio !== undefined) out.bio = patch.bio ?? null;
  if (patch.location !== undefined) (out as any).location = patch.location ?? null;
  if (patch.postcode !== undefined) (out as any).postcode = patch.postcode ?? null;
  if ((patch as any).mini_bio !== undefined) out.mini_bio = (patch as any).mini_bio ?? null;
  if (patch.avatar !== undefined) out.avatar = patch.avatar ?? null;
  if (patch.coverUrl !== undefined) out.cover_url = patch.coverUrl ?? null;
  if (patch.primaryTrade !== undefined) out.primary_trade = patch.primaryTrade ?? null;
  if (patch.businessName !== undefined) out.business_name = patch.businessName ?? null;
  if (patch.abn !== undefined) {
    out.abn = patch.abn ? normalizeAbnForDb(String(patch.abn)) : null;
  }
  if (patch.abnStatus !== undefined) out.abn_status = patch.abnStatus ?? null;
  if (patch.showAbnOnProfile !== undefined) out.show_abn_on_profile = !!patch.showAbnOnProfile;
  if (patch.showBusinessNameOnProfile !== undefined)
    out.show_business_name_on_profile = !!patch.showBusinessNameOnProfile;
  if (patch.additionalTrades !== undefined) out.additional_trades = patch.additionalTrades ?? null;
  if (patch.searchLocation !== undefined) out.search_location = patch.searchLocation ?? null;
  if (patch.searchPostcode !== undefined) out.search_postcode = patch.searchPostcode ?? null;
  // Search-from coords
  if (patch.searchLat !== undefined) out.search_lat = numOrNull(patch.searchLat);
  if (patch.searchLng !== undefined) out.search_lng = numOrNull(patch.searchLng);
  // Location coords (if patch supports them)
  if ((patch as any).locationLat !== undefined) out.location_lat = numOrNull((patch as any).locationLat);
  if ((patch as any).locationLng !== undefined) out.location_lng = numOrNull((patch as any).locationLng);
  // Keep base coords in sync for features still reading base_*.
  if ((patch as any).locationLat !== undefined) out.base_lat = numOrNull((patch as any).locationLat);
  if ((patch as any).locationLng !== undefined) out.base_lng = numOrNull((patch as any).locationLng);
  // Radius fields (often come from inputs/sliders as strings)
  if ((patch as any).radius !== undefined) out.radius = numOrNull((patch as any).radius);
  if ((patch as any).preferredRadiusKm !== undefined) out.preferred_radius_km = numOrNull((patch as any).preferredRadiusKm);
  if ((patch as any).subcontractorPreferredRadiusKm !== undefined)
    out.subcontractor_preferred_radius_km = numOrNull((patch as any).subcontractorPreferredRadiusKm);
  if (patch.isPublicProfile !== undefined) out.is_public_profile = patch.isPublicProfile ?? false;
  if (patch.website !== undefined) {
    out.website = patch.website ?? null;
    (out as any).website_url = patch.website ?? null;
  }
  if (patch.instagram !== undefined) {
    out.instagram = patch.instagram ?? null;
    (out as any).instagram_url = patch.instagram ?? null;
  }
  if (patch.facebook !== undefined) {
    out.facebook = patch.facebook ?? null;
    (out as any).facebook_url = patch.facebook ?? null;
  }
  if (patch.linkedin !== undefined) {
    out.linkedin = patch.linkedin ?? null;
    (out as any).linkedin_url = patch.linkedin ?? null;
  }
  if (patch.googleBusinessUrl !== undefined) (out as any).google_business_url = patch.googleBusinessUrl ?? null;
  if (patch.googleBusinessName !== undefined) (out as any).google_business_name = patch.googleBusinessName ?? null;
  if (patch.googleBusinessAddress !== undefined) (out as any).google_business_address = patch.googleBusinessAddress ?? null;
  if (patch.googlePlaceId !== undefined) (out as any).google_place_id = patch.googlePlaceId ?? null;
  if (patch.googleRating !== undefined) {
    (out as any).google_rating = patch.googleRating ?? null;
    (out as any).google_business_rating = patch.googleRating ?? null;
  }
  if (patch.googleReviewCount !== undefined) {
    (out as any).google_review_count = patch.googleReviewCount ?? null;
    (out as any).google_business_review_count = patch.googleReviewCount ?? null;
  }
  if (patch.googleListingClaimedByUser !== undefined) {
    (out as any).google_listing_claimed_by_user = !!patch.googleListingClaimedByUser;
  }
  if (patch.googleListingVerificationStatus !== undefined) {
    (out as any).google_listing_verification_status = normalizeGoogleListingVerificationStatus(
      patch.googleListingVerificationStatus
    );
  }
  if (patch.tiktok !== undefined) out.tiktok = patch.tiktok ?? null;
  if (patch.youtube !== undefined) out.youtube = patch.youtube ?? null;
  if ((patch as any).phone !== undefined) out.phone = (patch as any).phone ?? null;
  const showPhone = (patch as any).showPhoneOnProfile ?? (patch as any).show_phone_on_profile;
  if (showPhone !== undefined) out.show_phone_on_profile = !!showPhone;
  const showEmail = (patch as any).showEmailOnProfile ?? (patch as any).show_email_on_profile;
  if (showEmail !== undefined) out.show_email_on_profile = !!showEmail;
  if ((patch as any).receiveTradeAlerts !== undefined)
    (out as any).subcontractor_work_alerts_enabled = !!(patch as any).receiveTradeAlerts;
  return out;
}

/** DB columns that affect `calculate_profile_strength` / completeness & links. */
function dbPatchAffectsProfileStrength(dbPatch: Partial<DbUserRow>): boolean {
  const relevant = new Set([
    'name',
    'bio',
    'mini_bio',
    'avatar',
    'cover_url',
    'primary_trade',
    'additional_trades',
    'business_name',
    'website',
    'instagram',
    'facebook',
    'linkedin',
    'tiktok',
    'youtube',
    'website_url',
    'instagram_url',
    'facebook_url',
    'linkedin_url',
    'google_business_url',
    'google_rating',
    'google_review_count',
    'google_business_name',
    'google_business_address',
    'google_place_id',
    'google_business_rating',
    'google_business_review_count',
    'google_listing_claimed_by_user',
    'google_listing_verification_status',
    'google_listing_verified_at',
    'google_listing_verification_method',
    'google_listing_verified_by',
    'google_listing_rejection_reason',
    'location',
    'postcode',
    'location_lat',
    'location_lng',
    'base_lat',
    'base_lng',
    'search_location',
    'search_postcode',
    'search_lat',
    'search_lng',
    'radius',
    'preferred_radius_km',
    'subcontractor_preferred_radius_km',
    'is_public_profile',
    'abn',
    'abn_status',
    'abn_verified',
    'show_abn_on_profile',
    'show_business_name_on_profile',
    'phone',
    'show_phone_on_profile',
    'show_email_on_profile',
    'subcontractor_work_alerts_enabled',
  ]);
  return Object.keys(dbPatch).some((k) => relevant.has(k));
}

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabase() as any, []);

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // used to ignore stale async completions
  const seqRef = useRef(0);
  const welcomeEmailTriggeredRef = useRef<string | null>(null);
  const geocodeBackfillTriggeredRef = useRef<Set<string>>(new Set());

  const loadProfile = useCallback(
    async (userId: string): Promise<CurrentUser | null> => {
      try {
        // Use safe select: only columns that exist in all migrations. Do NOT request:
        // mini_bio, phone, show_phone_on_profile, show_email_on_profile, is_admin,
        // show_abn_on_profile, show_business_name_on_profile, pricing_type, pricing_amount,
        // show_pricing_on_profile, show_pricing_in_listings (may not exist in older DBs)
        const baseSelectNoProfileStrength =
          'id,email,name,role,trust_status,avatar,cover_url,bio,rating,reliability_rating,primary_trade,business_name,abn,abn_status,abn_verified,abn_verified_at,show_abn_on_profile,show_business_name_on_profile,additional_trades,website,instagram,facebook,linkedin,tiktok,youtube,' +
          'location,postcode,location_lat,location_lng,' +
          'is_premium,active_plan,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,' +
          'complimentary_premium_until,premium_until,additional_trades_unlocked,search_location,search_postcode,search_lat,search_lng,' +
          'is_public_profile,subcontractor_work_alerts_enabled,last_active_at';
        const baseSelect =
          baseSelectNoProfileStrength +
          ',profile_strength_score,profile_strength_band,website_url,instagram_url,facebook_url,linkedin_url,' +
          'google_business_url,google_business_name,google_business_address,google_place_id,google_rating,google_review_count,google_business_rating,google_business_review_count,google_listing_claimed_by_user,google_listing_verification_status,google_listing_verified_at,google_listing_verification_method,google_listing_verified_by,google_listing_rejection_reason';
        // Legacy DBs used lat/lng instead of location_lat/location_lng — only swap coords on the
        // "no Google/extra columns" select so we do not re-request missing extended columns.
        const legacyCoordsSafe = baseSelectNoProfileStrength.replace(
          'location_lat,location_lng,',
          'lat,lng,'
        );
        const loadWithSelect = (selectClause: string) =>
          (supabase.from('users') as any).select(selectClause).eq('id', userId).maybeSingle();

        /** Postgres 42703 + PostgREST PGRST204 ("schema cache") when a selected column is absent. */
        const isSchemaColumnError = (err: unknown) => {
          const code = String((err as { code?: unknown })?.code ?? '');
          if (code === '42703' || code === 'PGRST204' || code === 'PGRST205') return true;
          const msg = String((err as { message?: unknown })?.message ?? '').toLowerCase();
          if (msg.includes('column') && msg.includes('does not exist')) return true;
          if (msg.includes('schema cache')) return true;
          if (msg.includes('could not find') && msg.includes('column')) return true;
          return false;
        };

        // If this fails, we must not fall back to a row missing abn/location (empty profile edit UI).
        const minimalSelectWithCore =
          'id,email,name,role,trust_status,avatar,cover_url,bio,primary_trade,business_name,abn,abn_status,abn_verified,abn_verified_at,show_abn_on_profile,show_business_name_on_profile,additional_trades,location,postcode,location_lat,location_lng,is_public_profile';

        let { data: profile, error } = await loadWithSelect(baseSelect);

        if (error && isSchemaColumnError(error)) {
          const resPs = await loadWithSelect(baseSelectNoProfileStrength);
          profile = resPs.data;
          error = resPs.error;
        }

        if (error && isSchemaColumnError(error)) {
          const msg = String((error as any)?.message || '').toLowerCase();
          if (msg.includes('location_lat') || msg.includes('location_lng')) {
            const legacyRes = await loadWithSelect(legacyCoordsSafe);
            profile = legacyRes.data;
            error = legacyRes.error;
          }
        }

        if (error && isSchemaColumnError(error)) {
          const minimalRes = await loadWithSelect(minimalSelectWithCore);
          profile = minimalRes.data;
          error = minimalRes.error;
          if (error && isSchemaColumnError(error)) {
            const ultraRes = await loadWithSelect(
              'id,email,name,role,trust_status,primary_trade,additional_trades'
            );
            profile = ultraRes.data;
            error = ultraRes.error;
          }
        }

        if (error) {
          console.error('loadProfile error', error);
          return null;
        }
        if (!profile) return null;

        // Canonical trades: users.primary_trade + users.additional_trades (see getDisplayTradeListFromUserRow).

        // Provide defaults for columns not in safe select (may not exist in DB)
        (profile as any).show_abn_on_profile ??= false;
        (profile as any).show_business_name_on_profile ??= false;
        (profile as any).abn_verified ??= false;
        (profile as any).is_public_profile ??= true;
        (profile as any).pricing_type ??= null;
        (profile as any).pricing_amount ??= null;
        (profile as any).show_pricing_on_profile ??= false;
        (profile as any).show_pricing_in_listings ??= false;

        return mapDbToUi(profile as DbUserRow);
      } catch (e) {
        console.error('loadProfile unexpected error', e);
        return null;
      }
    },
    [supabase]
  );

  const ensureProfileRowInContext = useCallback(
    async (user: User): Promise<void> => {
      try {
        await ensureProfileRow(supabase, user);
        const profile = await loadProfile(user.id);
        if (profile) {
          setCurrentUser(profile);
          return;
        }
        // Keep app usable when DB profile fetch fails.
        setCurrentUser((prev) => prev ?? buildFallbackCurrentUser(user));
      } catch (e) {
        console.error('ensureProfileRow unexpected error', e);
        setCurrentUser((prev) => prev ?? buildFallbackCurrentUser(user));
      }
    },
    [loadProfile, supabase]
  );

  /**
   * IMPORTANT:
   * applySession no longer blocks isLoading. It sets session immediately,
   * then loads/ensures profile in the background.
   */
  const applySession = useCallback(
    (next: Session | null) => {
      const seq = ++seqRef.current;

      setSession(next ?? null);

      const user = next?.user ?? null;
      if (!user) {
        setCurrentUser(null);
        return;
      }
      setCurrentUser((prev) => (prev?.id === user.id ? prev : buildFallbackCurrentUser(user)));

      // background profile ensure/load (ignore stale completions)
      (async () => {
        try {
          await ensureProfileRowInContext(user);
        } finally {
          if (seq !== seqRef.current) return;
        }
      })();
    },
    [ensureProfileRowInContext]
  );

  const refreshUser = useCallback(async () => {
    const authUser = session?.user;
    if (!authUser?.id) {
      setCurrentUser(null);
      return;
    }
    const userId = authUser.id;
    const seq = ++seqRef.current;
    const profile = await loadProfile(userId);
    if (seq !== seqRef.current) return;
    if (profile) {
      setCurrentUser(profile);
      return;
    }
    // Degrade gracefully: avoid blocking the app on profile bootstrap failures.
    setCurrentUser((prev) => prev ?? buildFallbackCurrentUser(authUser));
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('getSession error', error);
        if (!alive) return;

        applySession((data?.session as Session) ?? null);
      } catch (e) {
        console.error('auth boot error', e);
        if (!alive) return;
        setSession(null);
        setCurrentUser(null);
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, nextSession: any) => {
      if (!alive) return;
      applySession((nextSession as Session) ?? null);
      // never block UI waiting for profile
      setIsLoading(false);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [applySession, supabase]);

  useActivityPing(session?.user?.id);

  useEffect(() => {
    if (!session?.user?.id || !currentUser?.id) return;
    if (welcomeEmailTriggeredRef.current === currentUser.id) return;
    welcomeEmailTriggeredRef.current = currentUser.id;

    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch((e) => {
      console.warn('[auth] welcome email trigger on session failed (non-blocking)', e);
    });
  }, [session?.user?.id, currentUser?.id]);

  useEffect(() => {
    if (!session?.user?.id || !currentUser?.id) return;
    if (session.user.id !== currentUser.id) return;

    const hasLocation = typeof currentUser.location === 'string' && currentUser.location.trim().length > 0;
    const hasCoords =
      typeof currentUser.lat === 'number' &&
      Number.isFinite(currentUser.lat) &&
      typeof currentUser.lng === 'number' &&
      Number.isFinite(currentUser.lng);
    if (!hasLocation || hasCoords) return;

    if (geocodeBackfillTriggeredRef.current.has(currentUser.id)) return;
    geocodeBackfillTriggeredRef.current.add(currentUser.id);

    fetch('/api/profile/geocode-location', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          console.warn('[auth] geocode backfill failed (non-blocking)', {
            status: res.status,
            body,
          });
          return;
        }
        await refreshUser();
      })
      .catch((e) => {
        console.warn('[auth] geocode backfill request failed (non-blocking)', e);
      });
  }, [
    session?.user?.id,
    currentUser?.id,
    currentUser?.location,
    currentUser?.lat,
    currentUser?.lng,
    refreshUser,
  ]);

  const login: AuthCtx['login'] = useCallback(
    async (email, password) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        applySession((data?.session as Session) ?? null);
        if (data?.session?.user?.id) {
          fetch('/api/activity/ping', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, supabase]
  );

  const signup: AuthCtx['signup'] = useCallback(
    async (name, email, password, primaryTrade, extras = {}) => {
      setIsLoading(true);
      try {
        const cleanedAbn = normalizeAbnForDb(extras.abn) ?? '';

        const signupLat = isValidDiscoveryCoord(extras.locationLat) ? extras.locationLat : null;
        const signupLng = isValidDiscoveryCoord(extras.locationLng) ? extras.locationLng : null;
        const hasSignupCoords = hasValidCoordinatePair(signupLat, signupLng);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: extras.role ?? null,
              primaryTrade: primaryTrade ?? null,
              // Keep snake_case for DB triggers that read raw_user_meta_data->>'primary_trade'.
              primary_trade: primaryTrade ?? null,
              businessName: extras.businessName ?? null,
              business_name: extras.businessName ?? null,
              abn: cleanedAbn || null,
              abn_entity_name: extras.abnEntityName ?? null,
              abnEntityName: extras.abnEntityName ?? null,
              abnEntityType: extras.abnEntityType ?? null,
              ...(extras.abnVerified === true
                ? {
                    abn_abr_verified: true,
                    abn_verified_at: new Date().toISOString(),
                    abnVerified: true,
                  }
                : {}),
              location: extras.location ?? null,
              postcode: extras.postcode ?? null,
              // Persist both camel/snake keys for compatibility and future backfills.
              locationLat: hasSignupCoords ? signupLat : null,
              locationLng: hasSignupCoords ? signupLng : null,
              location_lat: hasSignupCoords ? signupLat : null,
              location_lng: hasSignupCoords ? signupLng : null,
              trades: extras.trades ?? null,
              additionalTrades: extras.additionalTrades ?? null,
              // TODO: migrate trigger to use trade_categories; for now primary_trade = first
              trade_categories: extras.tradeCategories ?? null,
              legal_name: extras.legal_name ?? null,
              full_name: extras.legal_name ?? null, // Preserve full name in metadata (no DB column)
            },
          },
        });
        if (error) throw error;
        const hasSession = !!data?.session;

        // Apply session immediately (may be null if email confirm ON)
        applySession((data?.session as Session) ?? null);

        // Only run profile bootstrap when signup returned an authenticated session.
        // If email confirmation is enabled, this will run after the user verifies/signs in.
        if (hasSession && data?.user) {
          await ensureProfileRowInContext(data.user);
          fetch('/api/activity/ping', { method: 'POST', credentials: 'include' }).catch(() => {});
        }

        if (hasSession && data?.user?.id) {
          const normalizedTrades =
            extras.tradeCategories?.length
              ? [...new Set(extras.tradeCategories)]
              : primaryTrade
                ? [primaryTrade]
                : [];

          const lat = hasSignupCoords ? signupLat : null;
          const lng = hasSignupCoords ? signupLng : null;
          const tradeSplit = splitSelectedTrades(normalizedTrades, normalizedTrades.length > 1);
          const coordsUpdate: Record<string, unknown> = {
            primary_trade: tradeSplit.primary_trade,
            additional_trades: tradeSplit.additional_trades,
          };
          if (hasSignupCoords && lat != null && lng != null) {
            coordsUpdate.location_lat = lat;
            coordsUpdate.location_lng = lng;
            coordsUpdate.base_lat = lat;
            coordsUpdate.base_lng = lng;
          }

          await supabase
            .from('users')
            .update(coordsUpdate)
            .eq('id', data.user.id);

          // If location text exists but coords were not captured at signup,
          // backfill coordinates so discovery works immediately.
          if ((extras.location ?? '').trim() && (lat == null || lng == null)) {
            try {
              await fetch('/api/profile/geocode-location', { method: 'POST' });
            } catch {
              // non-blocking
            }
          }
        }

        // Trigger server-side welcome email pipeline (idempotent).
        // If email confirmation is enabled, session may be null; this best-effort call
        // is still safe because server checks auth and dedupes welcome events.
        try {
          if (data?.user?.id && data?.user?.email) {
            const verifyRes = await fetch('/api/email/account-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
                name,
              }),
            });
            if (!verifyRes.ok) {
              const verifyJson = await verifyRes.json().catch(() => null);
              console.warn('[auth] account-verification trigger failed (non-blocking)', {
                status: verifyRes.status,
                body: verifyJson,
              });
            }
          }

          // Welcome endpoint requires auth; skip when signup has no session yet.
          if (hasSession) {
            await fetch('/api/email/welcome', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {
          console.warn('[auth] welcome email trigger failed (non-blocking)', e);
        }

        // Merge extras into in-memory currentUser so UI doesn't break
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                primaryTrade: primaryTrade ?? prev.primaryTrade ?? null,
                location: extras.location ?? prev.location ?? null,
                postcode: extras.postcode ?? prev.postcode ?? null,
                businessName: extras.businessName ?? prev.businessName ?? null,
                abn: cleanedAbn || prev.abn || null,
                abnStatus: cleanedAbn
                  ? (extras.abnVerified ? 'VERIFIED' : 'UNVERIFIED')
                  : prev.abnStatus ?? null,
                trades: extras.tradeCategories ?? extras.trades ?? prev.trades,
                additionalTrades: extras.additionalTrades ?? prev.additionalTrades,

                /**
                 * IMPORTANT:
                 * Do NOT auto-unlock multi-trade based on stored additionalTrades.
                 * Unlocking should come from Premium/capabilities (or explicit admin grant).
                 */
                additionalTradesUnlocked: prev.additionalTradesUnlocked ?? false,
              }
            : prev
        );
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, ensureProfileRowInContext, supabase]
  );

  const updateUser: AuthCtx['updateUser'] = useCallback(
    async (patch) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      // Enforce premium rules using current in-memory user (before DB or merge)
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const canMultiTrade = hasSubcontractorPremium(prev) || prev.additionalTradesUnlocked === true;
        const canCustomSearch = hasBuilderPremium(prev) || hasContractorPremium(prev);

        if (patch.additionalTrades !== undefined && !canMultiTrade) {
          throw new Error('Additional trades require Premium');
        }
        if ((patch as any).receiveTradeAlerts === true && !hasSubcontractorPremium(prev)) {
          throw new Error('Premium required to enable email alerts');
        }
        const hasSearchPatch =
          patch.searchLocation !== undefined ||
          patch.searchPostcode !== undefined ||
          patch.searchLat !== undefined ||
          patch.searchLng !== undefined;
        if (hasSearchPatch && !canCustomSearch) {
          throw new Error('Custom search location requires Premium');
        }
        return prev;
      });

      let dbPatch = mapUiPatchToDb(patch);
      // Free users: block changing primary_trade after it's set. Allow initial set (onboarding).
      const canChange = currentUser ? canChangePrimaryTrade(currentUser) : false;
      const hasExistingTrade = !!(
        currentUser?.primaryTrade ??
        (currentUser?.additionalTrades && currentUser.additionalTrades.length > 0)
      );
      if (!canChange && hasExistingTrade) {
        if ('primary_trade' in dbPatch) delete (dbPatch as any).primary_trade;
        if ('trades' in dbPatch) delete (dbPatch as any).trades;
        if ('additional_trades' in dbPatch) delete (dbPatch as any).additional_trades;
      }
      if (Object.keys(dbPatch).length > 0) {
        const res = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ patch: dbPatch }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to update profile');
        }
      }

      // Merge all fields in-memory (until DB columns exist)
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const merged: CurrentUser = { ...prev, ...patch };
        if (patch.abn !== undefined) merged.abn = patch.abn ? normalizeAbnForDb(String(patch.abn)) : null;

        /**
         * IMPORTANT:
         * Do NOT auto-unlock multi-trade based on stored additionalTrades.
         * Keep the prior value unless a dedicated upgrade/admin flow sets it.
         */
        merged.additionalTradesUnlocked = prev.additionalTradesUnlocked ?? false;

        return merged;
      });

      await refreshUser();
      try {
        if (Object.keys(dbPatch).length > 0 && dbPatchAffectsProfileStrength(dbPatch)) {
          const res = await fetch('/api/profile/refresh-strength', { method: 'POST', credentials: 'include' });
          if (res.ok) await refreshUser();
        }
      } catch {
        // non-blocking
      }
    },
    [refreshUser, session?.user?.id, supabase]
  );

  const logout: AuthCtx['logout'] = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('signOut error', error);
        applySession(null);
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, supabase]
  );

  const value: AuthCtx = useMemo(
    () => ({
      session,
      currentUser,
      isLoading,
      login,
      signup,
      logout,
      refreshUser,
      updateUser,
    }),
    [session, currentUser, isLoading, login, signup, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthContextProvider>');
  return ctx;
}

export const AuthProvider = AuthContextProvider;
export default useAuth;
