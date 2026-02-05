export function getMonthKeyBrisbane(date: Date = new Date()): string {
  const brisbaneTime = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
  });

  const parts = brisbaneTime.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;

  return `${year}-${month}`;
}

import { getEffectiveSearchOrigin } from './search-origin';
import type { User } from './types';

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getTierDisplayName(tier: string): string {
  switch (tier) {
    case 'FREE_TRIAL':
      return 'Free Trial';
    case 'BASIC_8':
      return 'Basic ($8)';
    case 'PREMIUM_14':
      return 'Premium ($14)';
    default:
      return tier;
  }
}

export function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case 'FREE_TRIAL':
      return 'bg-gray-100 text-gray-800';
    case 'BASIC_8':
      return 'bg-blue-100 text-blue-800';
    case 'PREMIUM_14':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusDisplayName(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'LIVE':
      return 'Live';
    case 'CLOSED':
      return 'Closed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'LIVE':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getPublicQuoteStatus(
  status: string,
  quoteCap: number | null,
  quoteCount: number
): { label: string; color: string } {
  if (status === 'CLOSED' || status === 'CANCELLED') {
    return {
      label: 'Closed',
      color: 'bg-gray-100 text-gray-700'
    };
  }

  if (status === 'DRAFT') {
    return {
      label: 'Coming soon',
      color: 'bg-blue-100 text-blue-700'
    };
  }

  if (quoteCap !== null && quoteCap > 0) {
    if (quoteCount >= quoteCap) {
      return {
        label: 'Quotes full',
        color: 'bg-red-100 text-red-700'
      };
    }
    return {
      label: 'Limited quotes',
      color: 'bg-orange-100 text-orange-700'
    };
  }

  return {
    label: 'Open quotes',
    color: 'bg-green-100 text-green-700'
  };
}

export function canSubmitQuote(
  tenderQuoteCap: number | null,
  tenderQuoteCount: number
): boolean {
  if (tenderQuoteCap === null) return true;
  return tenderQuoteCount < tenderQuoteCap;
}

export function getContractorEffectiveRadius(
  contractorPlan: string,
  preferredRadiusKm: number
): number | null {
  if (contractorPlan === 'STANDARD_10') return 15;
  if (contractorPlan === 'PREMIUM_20') return preferredRadiusKm || null;
  return 15;
}

export function isTenderVisibleToContractor(
  tenderTier: string,
  tenderLat: number,
  tenderLng: number,
  contractorPlan: string,
  contractorLat: number | null,
  contractorLng: number | null,
  preferredRadiusKm: number
): boolean {
  if (!contractorLat || !contractorLng) return false;

  const distance = haversineDistance(tenderLat, tenderLng, contractorLat, contractorLng);

  if (tenderTier === 'FREE_TRIAL' || tenderTier === 'BASIC_8') {
    return distance <= 15;
  }

  if (tenderTier === 'PREMIUM_14') {
    const effectiveRadius = getContractorEffectiveRadius(contractorPlan, preferredRadiusKm);
    if (effectiveRadius === null) return true;
    return distance <= effectiveRadius;
  }

  return false;
}

/**
 * Returns the effective origin coords for radius/distance calculations.
 * Use this instead of inline user.searchLat ?? user.locationLat logic.
 * Non-premium users always get base location; premium with search-from get search-from.
 */
export function getOriginCoordsForRadiusFilter(
  user: User | null | undefined
): { lat: number | null; lng: number | null } {
  const origin = getEffectiveSearchOrigin(user);
  const lat = origin.lat;
  const lng = origin.lng;
  const safeLat =
    lat != null && typeof lat === 'number' && !Number.isNaN(lat) ? lat : null;
  const safeLng =
    lng != null && typeof lng === 'number' && !Number.isNaN(lng) ? lng : null;
  return { lat: safeLat, lng: safeLng };
}

/**
 * Visibility check using effective search origin (base vs search-from per Premium).
 * When origin has no coords, returns false (no radius filtering; existing behavior).
 */
export function isTenderVisibleToContractorFromUser(
  user: User | null | undefined,
  tenderTier: string,
  tenderLat: number,
  tenderLng: number,
  contractorPlan: string,
  preferredRadiusKm: number
): boolean {
  const { lat, lng } = getOriginCoordsForRadiusFilter(user);
  if (lat === null || lng === null) return false;
  return isTenderVisibleToContractor(
    tenderTier,
    tenderLat,
    tenderLng,
    contractorPlan,
    lat,
    lng,
    preferredRadiusKm
  );
}

export function getTenderDurationDays(tenderTier: string): number {
  switch (tenderTier) {
    case 'FREE_TRIAL':
      return 7;
    case 'BASIC_8':
      return 14;
    case 'PREMIUM_14':
      return 21;
    default:
      return 7;
  }
}
