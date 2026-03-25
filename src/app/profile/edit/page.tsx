'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Lock, MapPin, Globe, Plus, Trash2, X, Loader2, Star, ExternalLink } from 'lucide-react';
import { SiInstagram, SiFacebook, SiLinkedin, SiTiktok, SiYoutube } from 'react-icons/si';

import { AppLayout } from '@/components/app-nav';
import { ProfileAvatar } from '@/components/profile-avatar';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

import { RefinePillButton } from '@/components/ai/RefinePillButton';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import { useAuth } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { isAdmin } from '@/lib/is-admin';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { normalizeTrade, normalizeTradesList } from '@/lib/trades/normalizeTrade';
import { cn } from '@/lib/utils';
import { canCustomSearchLocation, canMultiTrade, canChangePrimaryTrade } from '@/lib/capability-utils';
import { hasValidABN } from '@/lib/abn-utils';
import { normalizeAbnForDb } from '@/lib/abn-normalize';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import { getGoogleBusinessStatusLabel } from '@/lib/google-business';

type GoogleBusinessSearchResult = {
  placeId: string;
  description: string;
};

type GoogleBusinessDetails = {
  placeId: string;
  name: string;
  address: string;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
};

function normalizePrimaryLocationSource(user: any): {
  suburb: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
} {
  const suburb = String(user?.location ?? user?.base_location ?? user?.search_location ?? '').trim();
  const postcode = String(user?.postcode ?? user?.base_postcode ?? user?.search_postcode ?? '').trim();
  const latCandidates = [user?.location_lat, user?.lat, user?.base_lat, user?.search_lat];
  const lngCandidates = [user?.location_lng, user?.lng, user?.base_lng, user?.search_lng];
  const lat = latCandidates.find((v) => typeof v === 'number' && Number.isFinite(v)) ?? null;
  const lng = lngCandidates.find((v) => typeof v === 'number' && Number.isFinite(v)) ?? null;
  return { suburb, postcode, lat, lng };
}
export default function EditProfilePage() {
  const { session, currentUser, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const hasSession = !!session?.user;

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/profile/edit')}`);
    }
  }, [currentUser, isLoading, router]);

  const cardClass =
    'mb-5 rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm backdrop-blur ' +
    'transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md';
  const innerBubbleClass =
    'rounded-xl border border-slate-200/70 bg-white/65 backdrop-blur p-4';
  const inputClass =
    'mt-1 bg-white/70 border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10';
  const linkIconBoxClass =
    'flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/70 shadow-sm';

  // Controlled values (always defined so hooks are stable)
  const [name, setName] = useState<string>('');
  const [miniBio, setMiniBio] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [primaryTrade, setPrimaryTrade] = useState<string>('');
  const [isPublicProfile, setIsPublicProfile] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);

  // free-text skills field (comma separated)
  const [tradesText, setTradesText] = useState<string>('');

  // Links (website + socials)
  const [website, setWebsite] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [facebook, setFacebook] = useState<string>('');
  const [linkedin, setLinkedin] = useState<string>('');
  const [tiktok, setTiktok] = useState<string>('');
  const [youtube, setYoutube] = useState<string>('');

  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');
  const [googleBusinessName, setGoogleBusinessName] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleRating, setGoogleRating] = useState('');
  const [googleReviewCount, setGoogleReviewCount] = useState('');
  const [googleListingVerificationStatus, setGoogleListingVerificationStatus] = useState<string>('UNVERIFIED');
  const [googleListingRejectionReason, setGoogleListingRejectionReason] = useState('');
  const [googleBusinessAddress, setGoogleBusinessAddress] = useState('');
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [googleSearchResults, setGoogleSearchResults] = useState<GoogleBusinessSearchResult[]>([]);
  const [googleSearchLoading, setGoogleSearchLoading] = useState(false);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);
  const [googleLookupMode, setGoogleLookupMode] = useState(false);
  const [googleSelectionLoading, setGoogleSelectionLoading] = useState(false);
  const [googleDropdownOpen, setGoogleDropdownOpen] = useState(false);
  const [googleHighlightedIndex, setGoogleHighlightedIndex] = useState(-1);
  const googleSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

  const [phone, setPhone] = useState<string>('');
  const [showPhoneOnProfile, setShowPhoneOnProfile] = useState<boolean>(false);
  const [showEmailOnProfile, setShowEmailOnProfile] = useState<boolean>(false);
  const [showAbnOnProfile, setShowAbnOnProfile] = useState<boolean>(false);
  const [showBusinessNameOnProfile, setShowBusinessNameOnProfile] = useState<boolean>(false);

  const [pricingType, setPricingType] = useState<string>('');
  const [pricingAmount, setPricingAmount] = useState<string>('');
  const [showPricingOnProfile, setShowPricingOnProfile] = useState<boolean>(false);
  const [showPricingInListings, setShowPricingInListings] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [isRefiningBio, setIsRefiningBio] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [addLocationSuburb, setAddLocationSuburb] = useState('');
  const [addLocationPostcode, setAddLocationPostcode] = useState('');
  const [addLocationLat, setAddLocationLat] = useState<number | null>(null);
  const [addLocationLng, setAddLocationLng] = useState<number | null>(null);

  const [additionalLocations, setAdditionalLocations] = useState<Array<{ id: string; location: string; postcode?: string | null; lat?: number | null; lng?: number | null }>>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [userTrades, setUserTrades] = useState<Array<{ id: string | null; trade: string; is_primary: boolean }>>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [addTradeOpen, setAddTradeOpen] = useState(false);

  // Load trades from API
  useEffect(() => {
    if (!hasSession || !currentUser?.id) return;
    let cancelled = false;
    (async () => {
      setTradesLoading(true);
      try {
        const res = await fetch('/api/profile/trades');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.trades)) {
          setUserTrades(data.trades);
        }
      } finally {
        if (!cancelled) setTradesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasSession, currentUser?.id]);

  // Sync primaryTrade when userTrades loads; fallback to currentUser for legacy
  useEffect(() => {
    if (userTrades.length > 0) {
      const primary = userTrades.find((t) => t.is_primary) ?? userTrades[0];
      setPrimaryTrade(primary.trade);
    } else if (!tradesLoading && currentUser?.primaryTrade) {
      setPrimaryTrade(currentUser.primaryTrade);
      setUserTrades([{ id: null, trade: currentUser.primaryTrade, is_primary: true }]);
    }
  }, [userTrades, currentUser?.primaryTrade, tradesLoading]);

  // Load additional locations from API (Premium users only)
  useEffect(() => {
    if (!hasSession || !currentUser?.id) return;
    let cancelled = false;
    (async () => {
      setLocationsLoading(true);
      try {
        const res = await fetch('/api/profile/locations');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.locations)) {
          setAdditionalLocations(data.locations);
        }
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasSession, currentUser?.id]);

  // Hydrate form state once user is available (and on user switch)
  useEffect(() => {
    if (!currentUser) return;
    const canonicalLocation = normalizePrimaryLocationSource(currentUser as any);

    setName(currentUser.name ?? '');
    setMiniBio((currentUser as any)?.miniBio ?? (currentUser as any)?.mini_bio ?? '');
    setBusinessName(currentUser.businessName ?? '');
    setBio(currentUser.bio ?? '');
    setPrimaryTrade((currentUser.primaryTrade as string | undefined) ?? ((currentUser as any)?.trades?.[0] as string | undefined) ?? '');
    setIsPublicProfile(currentUser.isPublicProfile ?? false);
    setLocation(canonicalLocation.suburb);
    setPostcode(canonicalLocation.postcode);
    setLocationLat(canonicalLocation.lat);
    setLocationLng(canonicalLocation.lng);

    setTradesText(((currentUser.trades ?? []) as string[]).join(', '));

    setWebsite((currentUser as any)?.website ?? '');
    setInstagram((currentUser as any)?.instagram ?? '');
    setFacebook((currentUser as any)?.facebook ?? '');
    setLinkedin((currentUser as any)?.linkedin ?? '');
    setTiktok((currentUser as any)?.tiktok ?? '');
    setYoutube((currentUser as any)?.youtube ?? '');

    setGoogleBusinessUrl(
      (currentUser as any)?.googleBusinessUrl ?? (currentUser as any)?.google_business_url ?? ''
    );
    setGoogleBusinessName(
      (currentUser as any)?.googleBusinessName ?? (currentUser as any)?.google_business_name ?? ''
    );
    setGooglePlaceId(
      (currentUser as any)?.googlePlaceId ?? (currentUser as any)?.google_place_id ?? ''
    );
    const gr = (currentUser as any)?.googleRating ?? (currentUser as any)?.google_rating;
    setGoogleRating(gr != null && gr !== '' ? String(gr) : '');
    const grc = (currentUser as any)?.googleReviewCount ?? (currentUser as any)?.google_review_count;
    setGoogleReviewCount(grc != null && grc !== '' ? String(grc) : '');
    setGoogleBusinessAddress(
      (currentUser as any)?.googleBusinessAddress ?? (currentUser as any)?.google_business_address ?? ''
    );
    setGoogleListingVerificationStatus(
      String(
        (currentUser as any)?.googleListingVerificationStatus ??
          (currentUser as any)?.google_listing_verification_status ??
          'UNVERIFIED'
      ).toUpperCase()
    );
    setGoogleListingRejectionReason(
      (currentUser as any)?.googleListingRejectionReason ?? (currentUser as any)?.google_listing_rejection_reason ?? ''
    );
    const hasLinkedGoogle = !!String(
      (currentUser as any)?.googlePlaceId ??
      (currentUser as any)?.google_place_id ??
      (currentUser as any)?.googleBusinessUrl ??
      (currentUser as any)?.google_business_url ??
      ''
    ).trim();
    setGoogleLookupMode(!hasLinkedGoogle);
    setGoogleSearchQuery('');
    setGoogleSearchResults([]);
    setGoogleSearchError(null);
    setGoogleDropdownOpen(false);
    setGoogleHighlightedIndex(-1);

    setPhone((currentUser as any)?.phone ?? '');
    setShowPhoneOnProfile((currentUser as any)?.showPhoneOnProfile ?? (currentUser as any)?.show_phone_on_profile ?? false);
    setShowEmailOnProfile((currentUser as any)?.showEmailOnProfile ?? (currentUser as any)?.show_email_on_profile ?? false);
    setShowAbnOnProfile((currentUser as any)?.showAbnOnProfile ?? (currentUser as any)?.show_abn_on_profile ?? false);
    setShowBusinessNameOnProfile((currentUser as any)?.showBusinessNameOnProfile ?? (currentUser as any)?.show_business_name_on_profile ?? false);

    const pt = (currentUser as any)?.pricingType ?? (currentUser as any)?.pricing_type ?? '';
    setPricingType(pt ? String(pt) : '');
    const pa = (currentUser as any)?.pricingAmount ?? (currentUser as any)?.pricing_amount;
    setPricingAmount(pa != null ? String(pa) : '');
    setShowPricingOnProfile((currentUser as any)?.showPricingOnProfile ?? (currentUser as any)?.show_pricing_on_profile ?? false);
    setShowPricingInListings((currentUser as any)?.showPricingInListings ?? (currentUser as any)?.show_pricing_in_listings ?? false);
  }, [currentUser]);

  useEffect(() => {
    if (!googleLookupMode) return;
    const query = googleSearchQuery.trim();
    if (query.length < 2) {
      setGoogleSearchResults([]);
      setGoogleSearchError(null);
      setGoogleSearchLoading(false);
      setGoogleDropdownOpen(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setGoogleSearchLoading(true);
        setGoogleSearchError(null);
        const res = await fetch(`/api/google-business/search?q=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setGoogleSearchResults([]);
          setGoogleSearchError(data?.error || 'Could not load Google business results right now');
          return;
        }
        setGoogleSearchResults(Array.isArray(data?.predictions) ? data.predictions : []);
        setGoogleDropdownOpen(true);
        setGoogleHighlightedIndex(-1);
      } catch {
        if (!cancelled) {
          setGoogleSearchResults([]);
          setGoogleSearchError('Could not load Google business results right now');
        }
      } finally {
        if (!cancelled) setGoogleSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [googleLookupMode, googleSearchQuery]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!googleSearchWrapRef.current) return;
      if (!googleSearchWrapRef.current.contains(event.target as Node)) {
        setGoogleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSelectGoogleBusiness = async (result: GoogleBusinessSearchResult) => {
    try {
      setGoogleSelectionLoading(true);
      setGoogleSearchError(null);
      const res = await fetch(`/api/google-business/details?placeId=${encodeURIComponent(result.placeId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.placeId) {
        toast.error(data?.error || 'Could not load selected Google listing');
        return;
      }
      const details = data as GoogleBusinessDetails;
      setGooglePlaceId(details.placeId || result.placeId);
      setGoogleBusinessName(details.name || '');
      setGoogleBusinessAddress(details.address || result.description || '');
      setGoogleBusinessUrl(details.googleMapsUrl || '');
      setGoogleRating(
        details.rating != null && Number.isFinite(Number(details.rating))
          ? String(details.rating)
          : ''
      );
      setGoogleReviewCount(
        details.reviewCount != null && Number.isFinite(Number(details.reviewCount))
          ? String(details.reviewCount)
          : ''
      );
      setGoogleListingVerificationStatus('SELF_CONFIRMED');
      setGoogleListingRejectionReason('');
      setGoogleLookupMode(false);
      setGoogleSearchQuery('');
      setGoogleSearchResults([]);
      setGoogleDropdownOpen(false);
      setGoogleHighlightedIndex(-1);
      await updateUser({
        googleBusinessUrl: details.googleMapsUrl || null,
        googleBusinessName: details.name || null,
        googleBusinessAddress: details.address || null,
        googlePlaceId: details.placeId || result.placeId || null,
        googleRating:
          details.rating != null && Number.isFinite(Number(details.rating))
            ? Number(details.rating)
            : null,
        googleReviewCount:
          details.reviewCount != null && Number.isFinite(Number(details.reviewCount))
            ? Number(details.reviewCount)
            : null,
        googleListingClaimedByUser: true,
      } as any);
      toast.success('Google business listing linked');
    } catch {
      toast.error('Could not load selected Google listing');
    } finally {
      setGoogleSelectionLoading(false);
    }
  };

  const handleRemoveGoogleBusiness = async () => {
    setGoogleBusinessUrl('');
    setGoogleBusinessName('');
    setGooglePlaceId('');
    setGoogleBusinessAddress('');
    setGoogleRating('');
    setGoogleReviewCount('');
    setGoogleListingVerificationStatus('UNVERIFIED');
    setGoogleListingRejectionReason('');
    setGoogleLookupMode(true);
    setGoogleSearchQuery('');
    setGoogleSearchResults([]);
    setGoogleSearchError(null);
    setGoogleDropdownOpen(false);
    setGoogleHighlightedIndex(-1);
    try {
      await updateUser({
        googleBusinessUrl: null,
        googleBusinessName: null,
        googleBusinessAddress: null,
        googlePlaceId: null,
        googleRating: null,
        googleReviewCount: null,
        googleListingClaimedByUser: false,
      } as any);
      toast.success('Google business listing removed');
    } catch {
      toast.error('Could not remove Google business listing');
    }
  };

  const canShowGoogleDropdown =
    googleLookupMode && googleDropdownOpen && googleSearchQuery.trim().length >= 2;

  const handleGoogleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!canShowGoogleDropdown) {
      if (e.key === 'Escape') setGoogleDropdownOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setGoogleHighlightedIndex((prev) => {
        if (googleSearchResults.length === 0) return -1;
        return Math.min(prev + 1, googleSearchResults.length - 1);
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setGoogleHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (googleHighlightedIndex >= 0 && googleSearchResults[googleHighlightedIndex]) {
        e.preventDefault();
        void handleSelectGoogleBusiness(googleSearchResults[googleHighlightedIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setGoogleDropdownOpen(false);
      setGoogleHighlightedIndex(-1);
    }
  };

  // Auto-open Links section if user already has links saved
  useEffect(() => {
    const any =
      !!(currentUser as any)?.website?.trim() ||
      !!(currentUser as any)?.instagram?.trim() ||
      !!(currentUser as any)?.facebook?.trim() ||
      !!(currentUser as any)?.linkedin?.trim() ||
      !!(currentUser as any)?.tiktok?.trim() ||
      !!(currentUser as any)?.youtube?.trim();
    if (any) setLinksOpen(true);
  }, [currentUser?.id]);

  // Sync businessName when ABN is verified (keeps locked display value aligned with state)
  useEffect(() => {
    if (!currentUser) return;
    const verified = hasValidABN(currentUser);
    const entityName =
      (currentUser as any)?.abnEntityName ??
      (currentUser as any)?.abn_entity_name ??
      currentUser.businessName ??
      '';
    if (verified && entityName) {
      setBusinessName(entityName);
    }
  }, [currentUser]);

  // Premium checks
  const isMultiTradeEnabled = currentUser ? canMultiTrade(currentUser) : false;
  const canAddLocations = currentUser ? canCustomSearchLocation(currentUser) : false;
  const canEditPrimaryLocation = currentUser ? canCustomSearchLocation(currentUser) : false;

  const handleAddLocation = async () => {
    if (!canAddLocations) {
      toast.error('Multiple locations require Premium');
      return;
    }
    const loc = addLocationSuburb.trim();
    if (!loc) {
      toast.error('Please select or enter a location');
      return;
    }
    const pc = addLocationPostcode.trim() || null;
    const exists = additionalLocations.some(
      (a) => a.location?.toLowerCase() === loc.toLowerCase() && (a.postcode || '') === (pc || '')
    );
    if (exists) {
      toast.error('This location is already added');
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch('/api/profile/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: loc,
          postcode: pc,
          lat: addLocationLat,
          lng: addLocationLng,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Failed to add location');
        return;
      }
      if (data?.location) {
        setAdditionalLocations((prev) => [
          ...prev,
          {
            id: data.location.id,
            location: data.location.location,
            postcode: data.location.postcode ?? null,
            lat: data.location.lat ?? null,
            lng: data.location.lng ?? null,
          },
        ]);
      }
      setAddLocationOpen(false);
      setAddLocationSuburb('');
      setAddLocationPostcode('');
      setAddLocationLat(null);
      setAddLocationLng(null);
      toast.success('Location added');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLocation = async (id: string) => {
    if (!canAddLocations) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/profile/locations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Failed to remove location');
        return;
      }
      setAdditionalLocations((prev) => prev.filter((l) => l.id !== id));
      toast.success('Location removed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove location');
    } finally {
      setIsSaving(false);
    }
  };

  const parsedTrades = useMemo<string[]>(() => {
    return tradesText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tradesText]);

  const selectedTrades = useMemo(() => userTrades.map((t) => t.trade), [userTrades]);
  const availableTradeOptions = useMemo(
    () => TRADE_CATEGORIES.filter((t) => !selectedTrades.includes(t)),
    [selectedTrades]
  );

  const handleAddTrade = (trade: string) => {
    if (!trade || !isMultiTradeEnabled) return;
    if (selectedTrades.includes(trade)) return;
    setUserTrades((prev) => {
      const next = [...prev.map((t) => ({ ...t, is_primary: false })), { id: null, trade, is_primary: false }];
      if (prev.length === 0) {
        next[next.length - 1].is_primary = true;
      }
      return next;
    });
    setAddTradeOpen(false);
  };

  const handleRemoveTrade = (trade: string) => {
    if (selectedTrades.length <= 1) return;
    const primary = userTrades.find((t) => t.is_primary);
    setUserTrades((prev) => {
      const next = prev.filter((t) => t.trade !== trade);
      if (primary?.trade === trade && next.length > 0) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryTrade = (trade: string) => {
    setUserTrades((prev) =>
      prev.map((t) => ({ ...t, is_primary: t.trade === trade }))
    );
    setPrimaryTrade(trade);
  };

  // Avoid rendering controlled inputs before user exists (after hooks are declared)
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  const isAbnVerified = hasValidABN(currentUser);
  const abnVerified = isAbnVerified;
  const abnNumber = (currentUser?.abn || '').toString();
  const verifiedEntityName =
    (currentUser as any)?.abnEntityName ??
    (currentUser as any)?.abn_entity_name ??
    currentUser.businessName ??
    null;
  const verifiedAbnNumber =
    (currentUser as any)?.abn ??
    (currentUser as any)?.abn_number ??
    null;
  const businessNameDisplay = (verifiedEntityName ?? currentUser?.businessName ?? '').toString();

  const primaryTradeValue = primaryTrade || selectedTrades[0] || '';
  const canEditTrades = canChangePrimaryTrade(currentUser);

  const ensureHttps = (raw: string) => {
    const v = (raw || '').trim();
    if (!v) return '';
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    return `https://${v}`;
  };

  const normalizeWebsite = (raw: string) => {
    const v = (raw || '').trim();
    if (!v) return '';
    return ensureHttps(v);
  };

  const normalizeHandleOrUrl = (raw: string, baseUrl: string) => {
    const v = (raw || '').trim();
    if (!v) return '';

    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.includes('.') || v.includes('/')) return ensureHttps(v);

    const handle = v.startsWith('@') ? v.slice(1) : v;
    if (!handle) return '';
    return `${baseUrl.replace(/\/$/, '')}/${handle}`;
  };

  const normalizeInstagram = (raw: string) => normalizeHandleOrUrl(raw, 'https://instagram.com');
  const normalizeFacebook = (raw: string) => normalizeHandleOrUrl(raw, 'https://facebook.com');
  const normalizeLinkedin = (raw: string) => normalizeHandleOrUrl(raw, 'https://linkedin.com/in');
  const normalizeTiktok = (raw: string) => normalizeHandleOrUrl(raw, 'https://tiktok.com/@');
  const normalizeYoutube = (raw: string) => {
    const v = (raw || '').trim();
    if (!v) return '';
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.includes('youtube.com') || v.includes('youtu.be') || v.includes('.') || v.includes('/')) return ensureHttps(v);
    const handle = v.startsWith('@') ? v : `@${v}`;
    return `https://youtube.com/${handle}`;
  };

  const buildPreviewLinks = () => {
    const links: { key: string; label: string; href: string }[] = [];
    const w = normalizeWebsite(website);
    const ig = normalizeInstagram(instagram);
    const fb = normalizeFacebook(facebook);
    const li = normalizeLinkedin(linkedin);
    const tt = normalizeTiktok(tiktok);
    const yt = normalizeYoutube(youtube);

    if (w) links.push({ key: 'website', label: 'Website', href: w });
    if (ig) links.push({ key: 'instagram', label: 'Instagram', href: ig });
    if (fb) links.push({ key: 'facebook', label: 'Facebook', href: fb });
    if (li) links.push({ key: 'linkedin', label: 'LinkedIn', href: li });
    if (tt) links.push({ key: 'tiktok', label: 'TikTok', href: tt });
    if (yt) links.push({ key: 'youtube', label: 'YouTube', href: yt });

    return links;
  };

  const handleDeleteAccount = async () => {
    const password = deletePassword.trim();
    if (!password) {
      toast.error('Password is required.');
      return;
    }

    try {
      setDeleteLoading(true);

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const code = payload?.error ?? payload?.message;
        const msg =
          code === 'INVALID_PASSWORD' ? 'Incorrect password.' :
          code === 'PASSWORD_REQUIRED' ? 'Password is required.' :
          typeof code === 'string' ? code :
          'Could not delete account. Please check your password and try again.';
        throw new Error(msg);
      }

      await getBrowserSupabase().auth.signOut();
      toast.success('Account deleted.');
      window.location.assign('/');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not delete account. Please check your password and try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
      setDeletePassword('');
    }
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      await updateUser({ avatar: newAvatarUrl });
      toast.success('Avatar updated');
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    }
  };

  const handleRefineBio = async () => {
    const raw = String(bio ?? '').trim();
    if (!raw) return;

    try {
      setIsRefiningBio(true);

      const res = await fetch('/api/ai/refine-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bio',
          text: raw,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? 'Could not refine bio.');
        return;
      }

      const refined = String(data?.refined ?? '').trim();
      if (!refined) {
        toast.error('AI did not return a refinement. Try again.');
        return;
      }

      setBio(refined);
      toast.success('Bio refined.');
    } catch (e) {
      console.error('[profile] refine bio failed', e);
      toast.error('Could not refine bio.');
    } finally {
      setIsRefiningBio(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedTrades = normalizeTradesList(selectedTrades);
    const effectivePrimary =
      normalizeTrade(primaryTrade?.trim() || '') || normalizedTrades[0] || '';
    if (!effectivePrimary && !isAdmin(currentUser)) {
      toast.error('Please select your primary trade');
      return;
    }

    const tradesToSave = normalizedTrades.length > 0 ? normalizedTrades : [effectivePrimary];
    if (tradesToSave.length > 1 && !isMultiTradeEnabled) {
      toast.error('Multiple trades require Premium');
      return;
    }

    setIsSaving(true);

    try {
      // Free users: primary trade is locked; skip trades API. Premium users: sync trades.
      if (canEditTrades) {
        const tradesRes = await fetch('/api/profile/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            primaryTrade: effectivePrimary,
            trades: tradesToSave,
          }),
        });
        if (!tradesRes.ok) {
          const data = await tradesRes.json().catch(() => ({}));
          toast.error(data?.error || 'Failed to save trades');
          setIsSaving(false);
          return;
        }
      }

      const cleanedAbn = normalizeAbnForDb(abnNumber || '') ?? '';
      const enteredAbn = cleanedAbn.length > 0;

      const payload: Record<string, unknown> = {
        name: name.trim() ? name.trim() : undefined,
        mini_bio: miniBio.trim() ? miniBio.trim() : null,
        bio: bio.trim() ? bio.trim() : undefined,

        businessName: isAbnVerified ? undefined : (businessName.trim() ? businessName.trim() : undefined),
        isPublicProfile,

        website: normalizeWebsite(website) || undefined,
        instagram: instagram.trim() ? normalizeInstagram(instagram) : undefined,
        facebook: facebook.trim() ? normalizeFacebook(facebook) : undefined,
        linkedin: linkedin.trim() ? normalizeLinkedin(linkedin) : undefined,
        tiktok: tiktok.trim() ? normalizeTiktok(tiktok) : undefined,
        youtube: youtube.trim() ? normalizeYoutube(youtube) : undefined,

        googleBusinessUrl: googleBusinessUrl.trim() || null,
        googleBusinessName: googleBusinessName.trim() || null,
        googlePlaceId: googlePlaceId.trim() || null,
        googleBusinessAddress: googleBusinessAddress.trim() || null,
        googleRating:
          googleRating.trim() && !Number.isNaN(Number(googleRating)) ? Number(googleRating) : null,
        googleReviewCount:
          googleReviewCount.trim() && !Number.isNaN(parseInt(googleReviewCount, 10))
            ? parseInt(googleReviewCount, 10)
            : null,
        googleListingClaimedByUser: !!(googlePlaceId.trim() || googleBusinessUrl.trim()),

        phone: phone.trim() ? phone.trim() : null,
        show_phone_on_profile: !!showPhoneOnProfile,
        show_email_on_profile: !!showEmailOnProfile,
        showAbnOnProfile: !!showAbnOnProfile,
        showBusinessNameOnProfile: !!showBusinessNameOnProfile,

        pricingType: pricingType || null,
        pricingAmount: pricingType && pricingType !== 'quote_on_request' && pricingAmount.trim()
          ? Number(pricingAmount) || null
          : null,
        showPricingOnProfile: pricingType ? !!showPricingOnProfile : false,
        showPricingInListings: pricingType ? !!showPricingInListings : false,

        ...(canEditPrimaryLocation
          ? {
              location: location.trim() || null,
              postcode: postcode.trim() || null,
              locationLat,
              locationLng,
            }
          : {}),

        abn: enteredAbn ? cleanedAbn : null,
      };

      // Strip ABN verification state — only verify-business / admin / explicit flows set verified flags
      delete (payload as any).abn_verified;
      delete (payload as any).abnVerified;
      delete (payload as any).abn_verified_at;
      delete (payload as any).abn_status;
      delete (payload as any).verified_abn;

      await updateUser(payload as any);

      toast.success('Profile updated successfully');
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
      setTimeout(() => router.push('/profile'), 2100);
    } catch (error) {
      console.error('Profile save failed', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200">
        {/* Dotted overlay - behind watermark */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.12) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        {/* Watermark (fixed to viewport) - above background, behind content */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-blackout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.06]"
          />
        </div>

        {/* Page content */}
        <div className="relative z-10 min-h-screen w-full py-8 overflow-x-hidden">
          <div className="mx-auto max-w-3xl px-4 pb-24">
            <form onSubmit={handleSave} className="space-y-6">
            <div className="sticky top-0 z-30 -mx-4 mb-5 border-b border-slate-900/10 bg-white/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-slate-900">Edit profile</h1>
                  {isSaving ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Saving…</span>
                  ) : savedTick ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Saved</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-600">Keep it short and clear — this is what businesses see first.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isSaving}>
                  Save changes
                </Button>
              </div>
            </div>
          </div>
          <div className={cardClass}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Basic details</h2>
              <p className="text-xs text-slate-600">Name, contact, and business information.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  <div className="group relative inline-block">
                    {/* Glow */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-4 rounded-full bg-blue-500/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />

                    {/* Ring + shadow container (now reserves space correctly) */}
                    <div className="relative overflow-hidden rounded-full ring-2 ring-slate-900/10 shadow-md transition-all duration-300 group-hover:ring-blue-500/25 group-hover:shadow-lg">
                      <ProfileAvatar
                        userId={currentUser.id}
                        currentAvatarUrl={currentUser.avatar ?? undefined}
                        userName={currentUser.name ?? 'User'}
                        onAvatarUpdate={handleAvatarUpdate}
                        size={154}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Profile Photo
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Upload a clear headshot or business logo.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Max file size 5MB.
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-slate-800">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Mini Bio
                </label>
                <textarea
                  value={miniBio}
                  onChange={(e) =>
                    setMiniBio(e.target.value.slice(0, 120))
                  }
                  placeholder="Short headline about you (e.g. Licensed plumber • 12+ years experience)"
                  rows={2}
                  maxLength={120}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-1 text-xs text-slate-500 text-right">
                  {miniBio?.length || 0}/120
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-800">Email</Label>
                <Input id="email" type="email" value={currentUser.email ?? ''} disabled className={`${inputClass} bg-slate-50`} />
                <p className="mt-1 text-xs text-slate-600">Email cannot be changed</p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-email-on-profile"
                    checked={showEmailOnProfile}
                    onChange={(e) => setShowEmailOnProfile(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Show email on profile</span>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-800">
                  Mobile Number
                </Label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g 04xx xxx xxx"
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional. Only shown if you enable the toggle below.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-phone-on-profile"
                    checked={showPhoneOnProfile}
                    onChange={(e) => setShowPhoneOnProfile(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Show mobile number on profile</span>
                </div>
              </div>
              {!isAdmin(currentUser) && (
                <div>
                  <Label htmlFor="businessName" className="text-sm font-medium text-slate-800">Business Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    value={isAbnVerified ? (verifiedEntityName ?? '') : businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Optional"
                    className={`${inputClass} ${isAbnVerified ? 'bg-slate-50' : ''}`}
                    disabled={isAbnVerified}
                  />
                  {isAbnVerified ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Locked because your ABN is verified.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600">
                      Optional. If left empty, your full name will be shown on your profile.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 border-t border-slate-200/70 pt-5">
                <button
                  type="button"
                  onClick={() => setLinksOpen((v) => !v)}
                  className="w-full text-left"
                  aria-expanded={linksOpen}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center">
                        <h3 className="text-base font-semibold text-blue-600">Links</h3>
                        <span className="ml-2 text-xs text-slate-500">
                          {buildPreviewLinks().length ? `${buildPreviewLinks().length} added` : 'Optional'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Add your website or socials. Paste a URL or a handle (e.g. @yourbusiness).
                      </p>

                      {/* Collapsed preview chips (only when closed) */}
                      {!linksOpen && buildPreviewLinks().length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {buildPreviewLinks().slice(0, 4).map((l) => (
                            <span
                              key={l.key}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                              title={l.href}
                            >
                              {l.label}
                            </span>
                          ))}
                          {buildPreviewLinks().length > 4 ? (
                            <span className="text-[11px] font-semibold text-slate-500">
                              +{buildPreviewLinks().length - 4} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 transition">
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${linksOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {linksOpen ? (
                <>
                <div className="mt-4 grid gap-3">
                  <div>
                    <Label htmlFor="website" className="text-sm font-medium text-slate-800">Website</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={linkIconBoxClass}>
                        <Globe className="h-4 w-4 text-slate-600" />
                      </div>
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="instagram" className="text-sm font-medium text-slate-800">Instagram</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={linkIconBoxClass}>
                        <SiInstagram className="h-4 w-4 text-slate-700" aria-hidden="true" />
                      </div>
                      <Input
                        id="instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@yourhandle or instagram.com/yourhandle"
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="facebook" className="text-sm font-medium text-slate-800">Facebook</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={linkIconBoxClass}>
                        <SiFacebook className="h-4 w-4 text-slate-700" aria-hidden="true" />
                      </div>
                      <Input
                        id="facebook"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder="@yourpage or facebook.com/yourpage"
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="linkedin" className="text-sm font-medium text-slate-800">LinkedIn</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={linkIconBoxClass}>
                        <SiLinkedin className="h-4 w-4 text-slate-700" aria-hidden="true" />
                      </div>
                      <Input
                        id="linkedin"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="@name or linkedin.com/in/name"
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tiktok" className="text-sm font-medium text-slate-800">TikTok</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={linkIconBoxClass}>
                        <SiTiktok className="h-4 w-4 text-slate-700" aria-hidden="true" />
                      </div>
                      <Input
                        id="tiktok"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.target.value)}
                        placeholder="@yourhandle"
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="youtube" className="text-sm font-medium text-slate-800">YouTube</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={linkIconBoxClass}>
                        <SiYoutube className="h-4 w-4 text-slate-700" aria-hidden="true" />
                      </div>
                      <Input
                        id="youtube"
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        placeholder="@channelhandle or youtube.com/@channel"
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div className="col-span-full border-t border-slate-200 pt-4">
                    <h4 className="text-xs font-semibold text-slate-800">Google Business (optional)</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Link your Google business listing from Google to strengthen your profile credibility.
                    </p>
                    <div className="mt-3 space-y-3">
                      {googleLookupMode ? (
                        <div className="space-y-2" ref={googleSearchWrapRef}>
                          <Label htmlFor="google_business_search" className="text-sm font-medium text-slate-800">
                            Search Google business listing
                          </Label>
                          <div className="relative">
                            <Input
                              id="google_business_search"
                              value={googleSearchQuery}
                              onChange={(e) => {
                                setGoogleSearchQuery(e.target.value);
                                if (!googleDropdownOpen) setGoogleDropdownOpen(true);
                              }}
                              onFocus={() => {
                                if (googleSearchQuery.trim().length >= 2) setGoogleDropdownOpen(true);
                              }}
                              onKeyDown={handleGoogleSearchKeyDown}
                              aria-expanded={canShowGoogleDropdown}
                              aria-controls="google-business-results"
                              placeholder="Search your business name and suburb..."
                              className={`mt-1 pr-9 ${inputClass}`}
                              autoComplete="off"
                            />
                            {googleSearchLoading || googleSelectionLoading ? (
                              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                            ) : (
                              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            )}
                          </div>
                          {googleSearchQuery.trim().length < 2 ? (
                            <p className="text-[11px] text-slate-500">
                              Start typing to find your business on Google. Select the correct listing to link it to your profile.
                            </p>
                          ) : null}

                          {canShowGoogleDropdown ? (
                            <div
                              id="google-business-results"
                              role="listbox"
                              className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm"
                            >
                              {googleSearchLoading ? (
                                <p className="px-3 py-2 text-sm text-slate-500">Searching Google listings...</p>
                              ) : googleSearchError ? (
                                <p className="px-3 py-2 text-sm text-slate-600">Could not load Google business results right now</p>
                              ) : googleSearchResults.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-slate-500">No businesses found</p>
                              ) : (
                                googleSearchResults.map((r, index) => (
                                  <button
                                    key={r.placeId}
                                    type="button"
                                    role="option"
                                    aria-selected={googleHighlightedIndex === index}
                                    onMouseEnter={() => setGoogleHighlightedIndex(index)}
                                    onClick={() => handleSelectGoogleBusiness(r)}
                                    className={`flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${
                                      googleHighlightedIndex === index ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                                    }`}
                                    disabled={googleSelectionLoading}
                                  >
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span className="text-sm text-slate-800">{r.description}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 md:text-base">
                                {googleBusinessName || 'Google listing linked'}
                              </p>
                              <p className="text-xs text-slate-600">{googleBusinessAddress || 'Address unavailable'}</p>
                              <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">Linked from Google</p>
                              {(googleRating.trim() || googleReviewCount.trim()) ? (
                                <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-700">
                                  <Star className="h-3.5 w-3.5 text-amber-500" />
                                  {googleRating.trim() ? `${Number(googleRating).toFixed(1)}` : '—'}
                                  {googleReviewCount.trim() ? ` (${googleReviewCount} reviews)` : ''}
                                </p>
                              ) : null}
                              {googleBusinessUrl.trim() ? (
                                <a
                                  href={googleBusinessUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700 underline-offset-4 hover:underline"
                                >
                                  Open Google Maps
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setGoogleLookupMode(true)}
                              disabled={googleSelectionLoading}
                            >
                              Change listing
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveGoogleBusiness}
                              className="text-red-700 hover:bg-red-50 hover:text-red-800"
                              disabled={googleSelectionLoading}
                            >
                              Remove listing
                            </Button>
                          </div>
                        </div>
                      )}
                      {googleLookupMode ? (
                        <p className="text-xs text-slate-500">No Google business linked yet</p>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                          <span className="font-medium">
                            {String(googleListingVerificationStatus).toUpperCase() === 'SELF_CONFIRMED'
                              ? 'Self-confirmed'
                              : getGoogleBusinessStatusLabel({ google_listing_verification_status: googleListingVerificationStatus })}
                          </span>
                        </div>
                      )}
                      {String(googleListingVerificationStatus).toUpperCase() === 'REJECTED' && googleListingRejectionReason.trim() ? (
                        <p className="text-xs text-slate-500">{googleListingRejectionReason.trim()}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-700">Preview</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {buildPreviewLinks().length === 0 ? (
                      <span className="text-xs text-slate-500">Add website or social links above to preview them here.</span>
                    ) : (
                      buildPreviewLinks().map((l) => (
                        <a
                          key={l.key}
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white hover:shadow-sm transition"
                          title={l.href}
                        >
                          <span>{l.label}</span>
                          <span className="text-slate-400">↗</span>
                        </a>
                      ))
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Tip: You can paste a full URL or just your handle (e.g. @tradehub).
                  </p>
                </div>
                </>
                ) : null}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">About</h2>
              <p className="text-xs text-slate-600">A short summary for businesses and clients.</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="bio" className="text-sm font-medium text-slate-800">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className={inputClass}
                />
                <div className="mt-3 flex justify-end">
                  <RefinePillButton
                    variant="secondary"
                    loading={isRefiningBio}
                    disabled={!bio.trim()}
                    onClick={handleRefineBio}
                  />
                </div>
                {!bio.trim() && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Write a bio first to use AI refinement.
                  </p>
                )}
              </div>
            </div>
          </div>

          {!isAdmin(currentUser) && currentUser.role === 'subcontractor' && (
          <div className={cardClass}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Pricing</h2>
              <p className="text-xs text-slate-600">Optional. Only shown publicly if you enable visibility below.</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pricingType" className="text-sm font-medium text-slate-800">Pricing type</Label>
                <Select value={pricingType || 'none'} onValueChange={(v) => setPricingType(v === 'none' ? '' : v)}>
                  <SelectTrigger className={`mt-1 ${inputClass}`}>
                    <SelectValue placeholder="Select pricing type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No pricing</SelectItem>
                    <SelectItem value="hourly">Typical rate: $/hr</SelectItem>
                    <SelectItem value="from_hourly">From $/hr</SelectItem>
                    <SelectItem value="day">Day rate available</SelectItem>
                    <SelectItem value="quote_on_request">Pricing on enquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(pricingType === 'hourly' || pricingType === 'from_hourly') && (
                <div>
                  <Label htmlFor="pricingAmount" className="text-sm font-medium text-slate-800">Amount ($)</Label>
                  <Input
                    id="pricingAmount"
                    type="number"
                    min={0}
                    step={1}
                    value={pricingAmount}
                    onChange={(e) => setPricingAmount(e.target.value)}
                    placeholder="e.g. 95"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              )}
              {pricingType && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="showPricingOnProfile"
                      checked={showPricingOnProfile}
                      onCheckedChange={setShowPricingOnProfile}
                    />
                    <Label htmlFor="showPricingOnProfile" className="text-sm font-medium text-slate-800">
                      Show pricing on profile page
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="showPricingInListings"
                      checked={showPricingInListings}
                      onCheckedChange={setShowPricingInListings}
                    />
                    <Label htmlFor="showPricingInListings" className="text-sm font-medium text-slate-800">
                      Show pricing in discovery listings
                    </Label>
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {!isAdmin(currentUser) && (
          <div className={cardClass}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Trades</h2>
              <p className="text-xs text-slate-600">Your primary trade and skills for job matching.</p>
            </div>
            <div className="space-y-3">
              {/* Primary trade: editable for Premium, read-only for Free */}
              <div>
                <Label className="text-sm font-medium text-slate-800">
                  Primary Trade <span className="text-red-500">*</span>
                </Label>
                <div className="mt-1">
                  {canEditTrades ? (
                    <Select
                      value={primaryTradeValue || undefined}
                      onValueChange={(v) => {
                        setPrimaryTrade(v);
                        if (selectedTrades.includes(v)) {
                          handleSetPrimaryTrade(v);
                        } else {
                          setUserTrades(
                            isMultiTradeEnabled
                              ? (prev) => [
                                  ...prev.map((t) => ({ ...t, is_primary: false })),
                                  { id: null, trade: v, is_primary: true },
                                ]
                              : () => [{ id: null, trade: v, is_primary: true }]
                          );
                        }
                      }}
                      disabled={tradesLoading}
                    >
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select your primary trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_CATEGORIES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div
                      className={cn(
                        inputClass,
                        'flex min-h-10 items-center rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700'
                      )}
                    >
                      {primaryTradeValue || '—'}
                    </div>
                  )}
                </div>
                {!canEditTrades && (
                  <>
                    <p className="mt-2 text-xs text-slate-600">
                      Your primary trade is locked on the Free plan.
                    </p>
                    <PremiumUpsellBar
                      title="Unlock additional trades with Premium"
                      description="Premium lets you add more trades while keeping your primary trade set by you."
                      ctaLabel="See Premium"
                      href="/pricing"
                      className="mt-3"
                      mobileCollapsible={true}
                    />
                  </>
                )}
              </div>

              {/* Premium: additional trades */}
              {isMultiTradeEnabled && (
                <div>
                  <Label className="text-sm font-medium text-slate-800">Additional trades</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTrades.map((trade) => {
                      const isPrimary = trade === primaryTradeValue;
                      return (
                        <Badge
                          key={trade}
                          variant="secondary"
                          className={cn(
                            'gap-1.5 py-1.5 pl-2.5 pr-1.5 text-sm font-medium',
                            isPrimary && 'ring-2 ring-slate-400 ring-offset-1'
                          )}
                        >
                          {isPrimary && <span className="text-xs text-slate-500">Primary</span>}
                          <span>{trade}</span>
                          {selectedTrades.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTrade(trade)}
                              disabled={isSaving}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300/50 focus:outline-none disabled:opacity-50"
                              aria-label={`Remove ${trade}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </Badge>
                      );
                    })}
                    <Popover open={addTradeOpen} onOpenChange={setAddTradeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 rounded-lg border-slate-300"
                          disabled={isSaving}
                        >
                          <Plus className="h-4 w-4" />
                          Add trades
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="max-h-60 overflow-y-auto p-1">
                          {availableTradeOptions.length === 0 ? (
                            <p className="px-2 py-3 text-sm text-slate-500">All trades selected</p>
                          ) : (
                            availableTradeOptions.map((t) => (
                              <button
                                key={t}
                                type="button"
                                className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
                                onClick={() => handleAddTrade(t)}
                              >
                                {t}
                              </button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Optional free-text skills (profile copy only) */}
              {currentUser.role === 'subcontractor' && (
                <div>
                  <Label htmlFor="tradesText" className="text-sm font-medium text-slate-800">Additional Trade Skills</Label>
                  <Input
                    id="tradesText"
                    type="text"
                    value={tradesText}
                    onChange={(e) => setTradesText(e.target.value)}
                    placeholder="e.g., Commercial Electrical, Residential Wiring"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-600">
                    Optional: List specific skills or specializations (separate with commas)
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {!isAdmin(currentUser) && (
          <div id="location" className={cardClass}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Location / Service area</h2>
                <p className="text-xs text-slate-600">Where you&apos;re based and where you can work.</p>
              </div>
              {canAddLocations && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 rounded-lg border-slate-300"
                  onClick={() => setAddLocationOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add location</span>
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {/* Primary / base location */}
              <div className={`${innerBubbleClass} space-y-3`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Primary location</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Used as your discovery center. Select a suburb suggestion to save map coordinates.
                    </p>
                  </div>
                  <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full bg-slate-100 border border-slate-200">
                    <MapPin className="h-5 w-5 text-slate-500" />
                  </div>
                </div>
                <SuburbAutocomplete
                  value={location}
                  postcode={postcode}
                  onSuburbChange={setLocation}
                  onPostcodeChange={setPostcode}
                  onLatLngChange={(lat, lng) => {
                    setLocationLat(lat);
                    setLocationLng(lng);
                  }}
                  disabled={!canEditPrimaryLocation}
                />
                {!canEditPrimaryLocation && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Lock className="h-3.5 w-3.5" />
                    Primary location is locked on Free plans
                  </p>
                )}
              </div>

              {!canAddLocations && (
                <PremiumUpsellBar
                  title="Manage your service area with Premium"
                  description="Upgrade to Premium to update your primary location and add multiple service areas to expand your reach."
                  ctaLabel="See Premium"
                  href="/pricing"
                  className="mt-4"
                  mobileCollapsible={true}
                />
              )}

              {/* Additional locations (Premium) */}
              {additionalLocations.map((loc) => (
                <div
                  key={loc.id}
                  className={`${innerBubbleClass} flex items-center justify-between gap-4`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {loc.location}
                      {loc.postcode ? `, ${loc.postcode}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Additional location</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveLocation(loc.id)}
                      disabled={isSaving}
                      aria-label="Remove location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add location dialog */}
            <Dialog
              open={addLocationOpen}
              onOpenChange={(open) => {
                setAddLocationOpen(open);
                if (!open) {
                  setAddLocationSuburb('');
                  setAddLocationPostcode('');
                  setAddLocationLat(null);
                  setAddLocationLng(null);
                }
              }}
            >
              <DialogContent className="sm:max-w-md" aria-describedby="add-location-desc">
                <DialogHeader>
                  <DialogTitle>Add location</DialogTitle>
                  <DialogDescription id="add-location-desc">
                    Add an additional service area. Select a suburb or enter location details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <SuburbAutocomplete
                    value={addLocationSuburb}
                    postcode={addLocationPostcode}
                    onSuburbChange={setAddLocationSuburb}
                    onPostcodeChange={setAddLocationPostcode}
                    onLatLngChange={(lat, lng) => {
                      setAddLocationLat(lat);
                      setAddLocationLng(lng);
                    }}
                    required
                  />
                  {addLocationSuburb.trim() && !addLocationPostcode.trim() && (
                    <p className="text-xs text-slate-600">
                      This location is too broad to determine a postcode automatically. Choose a more specific suburb or enter the postcode manually.
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddLocationOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddLocation}
                      disabled={isSaving || !addLocationSuburb.trim()}
                    >
                      {isSaving ? 'Adding…' : 'Add location'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          )}

          {!isAdmin(currentUser) && (
          <div id="public-profile" className={cardClass}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Public profile</h2>
              <p className="text-xs text-slate-600">If enabled, you can appear in &quot;Trades near you&quot; lists.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="isPublicProfile" className="cursor-pointer text-sm font-medium text-slate-800">
                  Show my profile in discovery
                </Label>
                <Switch
                  id="isPublicProfile"
                  checked={isPublicProfile}
                  onCheckedChange={setIsPublicProfile}
                />
              </div>
            </div>
          </div>
          )}

          <div className={cardClass}>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-900">Verification</div>
              <div className="text-xs text-slate-600">
                ABN is only required for posting jobs and applying to jobs posted by others. You can verify anytime.
              </div>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">ABN verification</div>

                {abnVerified ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-2 py-1 text-xs font-semibold text-slate-900 border border-slate-200">
                    {/* Instagram-style verified badge */}
                    <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1D9BF0] shadow-sm">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    ⏳ Optional
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-slate-600">
                {businessNameDisplay || abnNumber ? (
                  <span>
                    {businessNameDisplay || '—'} • {abnNumber || '—'}
                  </span>
                ) : (
                  <span>No ABN saved yet.</span>
                )}
              </div>

              {/* Visibility toggles */}
              <div className="mt-4 grid gap-3">
                <label className="flex items-start justify-between gap-4 rounded-xl border bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Show ABN number on profile</div>
                    <div className="text-xs text-slate-600">Lets others see your ABN on your public profile.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAbnOnProfile((prev) => !prev)}
                    className={[
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      showAbnOnProfile ? 'bg-blue-600' : 'bg-slate-300',
                    ].join(' ')}
                    aria-pressed={showAbnOnProfile}
                  >
                    <span
                      className={[
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                        showAbnOnProfile ? 'translate-x-5' : 'translate-x-1',
                      ].join(' ')}
                    />
                  </button>
                </label>

                <label className="flex items-start justify-between gap-4 rounded-xl border bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Show verified business name on profile</div>
                    <div className="text-xs text-slate-600">Shows your verified business name publicly.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBusinessNameOnProfile((prev) => !prev)}
                    className={[
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      showBusinessNameOnProfile ? 'bg-blue-600' : 'bg-slate-300',
                    ].join(' ')}
                    aria-pressed={showBusinessNameOnProfile}
                  >
                    <span
                      className={[
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                        showBusinessNameOnProfile ? 'translate-x-5' : 'translate-x-1',
                      ].join(' ')}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-red-900">Delete account</h2>
                <p className="mt-1 text-xs text-red-900/80">
                  This will remove your profile info, avatar/cover, and soft-delete your jobs.
                  For security, you&apos;ll need to confirm your password.
                </p>
              </div>

              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => setDeleteOpen(true)}
              >
                Delete account
              </Button>
            </div>
          </div>

          <Dialog open={deleteOpen} onOpenChange={(v) => !deleteLoading && setDeleteOpen(v)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm account deletion</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Enter your password to permanently delete your account.
                </p>

                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">
                    ⚠️ This action is permanent
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    Your account and all associated data — including profile information,
                    messages, jobs, and reviews — will be permanently deleted.
                    This cannot be undone.
                  </p>
                </div>

                <div>
                  <Label htmlFor="deletePassword">Password</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword.trim()}
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
