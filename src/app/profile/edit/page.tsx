'use client';

/*
 * QA_ONLY — MANUAL QA CHECKLIST (Profile Edit + Avatar)
 * [ ] Prefill check: name, bio, business name, primary trade, search-from hydrate from currentUser
 * [ ] Save name/bio persists after refresh (reload /profile then /profile/edit)
 * [ ] Primary trade locked behavior: once set, field is disabled with lock icon
 * [ ] Additional trades premium enforcement: non-premium sees upgrade CTA; premium can add trades
 * [ ] Search-from premium enforcement: non-premium sees upgrade CTA; premium can set custom location
 * [ ] Avatar upload persists after refresh: upload image, reload /profile and /profile/edit, confirm URL and image
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, Lock, MapPin } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { ProfileAvatar } from '@/components/profile-avatar';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { TRADE_CATEGORIES } from '@/lib/trades';
import {
  hasSubcontractorPremium,
  canCustomSearchLocation,
} from '@/lib/capability-utils';
import { getEffectiveSearchOrigin } from '@/lib/search-origin';

export default function EditProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const router = useRouter();

  // Controlled values (always defined so hooks are stable)
  const [name, setName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [primaryTrade, setPrimaryTrade] = useState<string>('');

  // free-text skills field (comma separated)
  const [tradesText, setTradesText] = useState<string>('');

  // Premium "search from" (UI-only for now)
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [searchPostcode, setSearchPostcode] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);

  // Hydrate form state once user is available (and on user switch)
  useEffect(() => {
    if (!currentUser) return;

    setName(currentUser.name ?? '');
    setBusinessName(currentUser.businessName ?? '');
    setBio(currentUser.bio ?? '');
    setPrimaryTrade(currentUser.primaryTrade ?? '');

    setTradesText(((currentUser.trades ?? []) as string[]).join(', '));

    setSearchLocation(((currentUser as any)?.searchLocation as string) ?? '');
    setSearchPostcode(((currentUser as any)?.searchPostcode as string) ?? '');
  }, [currentUser]);

  // Premium checks
  const canMultiTrade = currentUser ? hasSubcontractorPremium(currentUser) || !!currentUser.additionalTradesUnlocked : false;
  const canUseSearchFrom = currentUser ? canCustomSearchLocation(currentUser) : false;

  const parsedTrades = useMemo<string[]>(() => {
    return tradesText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tradesText]);

  const availableAdditionalTradeOptions = useMemo<string[]>(() => {
    const primary = currentUser?.primaryTrade ?? '';
    const existing = currentUser?.additionalTrades ?? [];
    return TRADE_CATEGORIES.filter((t) => t !== primary && !existing.includes(t));
  }, [currentUser?.primaryTrade, currentUser?.additionalTrades]);

  // Avoid rendering controlled inputs before user exists (after hooks are declared)
  if (!currentUser) return null;

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      await updateUser({ avatar: newAvatarUrl });
      toast.success('Avatar updated');
      // QA_ONLY: dev-only post-upload verification — warn if avatar URL not reachable
      if (process.env.NODE_ENV !== 'production') {
        try {
          const res = await fetch(newAvatarUrl, { method: 'HEAD' });
          if (!res.ok) {
            console.warn('[QA] Avatar URL not reachable after upload:', newAvatarUrl, 'status:', res.status);
          }
        } catch (fetchErr) {
          console.warn('[QA] Avatar URL fetch failed (CORS or network):', newAvatarUrl, fetchErr);
        }
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    }
  };

  const handleAddAdditionalTrade = async (trade: string) => {
    if (!trade) return;

    if (!canMultiTrade) {
      toast.error('Additional trades require Premium');
      return;
    }

    const next = Array.from(new Set([...(currentUser.additionalTrades ?? []), trade]));

    try {
      setIsSaving(true);
      await updateUser({ additionalTrades: next });
      toast.success('Trade added');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add trade');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Primary trade is required for non-admins (even if UI-only for now)
    if (!primaryTrade.trim() && !isAdmin(currentUser)) {
      toast.error('Please select your primary trade');
      return;
    }

    setIsSaving(true);

    try {
      /**
       * IMPORTANT:
       * - Only name/bio/avatar/role are persisted today.
       * - Everything else is merged in-memory by auth-context so the UI stays consistent.
       */
      await updateUser(
        {
          name: name.trim() ? name.trim() : undefined,
          bio: bio.trim() ? bio.trim() : undefined,

          // UI-only fields for now (safe because auth merges them into state)
          businessName: businessName.trim() ? businessName.trim() : undefined,
          primaryTrade: primaryTrade.trim() ? primaryTrade.trim() : undefined,
          trades: parsedTrades.length > 0 ? parsedTrades : undefined,

          /**
           * CRITICAL:
           * Do NOT overwrite base business location with Premium "Search From" values.
           * Base location/postcode remain the user's actual location.
           * Premium search-from is stored separately below.
           */
          location: undefined,
          postcode: undefined,

          // Store UI-only search fields too (not typed on CurrentUser; updateUser accepts Partial and merges)
          ...(searchLocation ? ({ searchLocation: searchLocation.trim() } as any) : null),
          ...(searchPostcode ? ({ searchPostcode: searchPostcode.trim() } as any) : null),
        } as any
      );

      toast.success('Profile updated successfully');
      router.push('/profile');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[QA] Profile save failed', error);
      } else {
        console.error(error);
      }
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Role used for UI routing/copy only, not permissions
  const dashboardHref = '/dashboard';

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <PageHeader backLink={{ href: dashboardHref }} title="Edit Profile" description="Update your information" />

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
            <div>
              <Label>Profile Photo</Label>
              <div className="mt-2">
                <ProfileAvatar
                  userId={currentUser.id}
                  currentAvatarUrl={currentUser.avatar ?? undefined}
                  userName={currentUser.name ?? 'User'}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">Click to upload a new photo (max 5MB)</p>
            </div>

            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={currentUser.email ?? ''} disabled className="mt-1 bg-gray-50" />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            {!isAdmin(currentUser) && (
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Optional"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">(Will persist once business fields are added to the database.)</p>
              </div>
            )}

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="mt-1"
              />
            </div>

            {!isAdmin(currentUser) && (
              <div>
                <Label htmlFor="primaryTrade">
                  Primary Trade {!currentUser.primaryTrade && <span className="text-red-500">*</span>}
                </Label>

                {currentUser.primaryTrade ? (
                  <>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id="primaryTrade"
                        type="text"
                        value={currentUser.primaryTrade ?? ''}
                        disabled
                        className="flex-1 bg-gray-50"
                      />
                      <Lock className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Locked after account creation.</p>
                  </>
                ) : (
                  <>
                    <Select value={primaryTrade} onValueChange={(v: string) => setPrimaryTrade(v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your primary trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_CATEGORIES.map((trade: string) => (
                          <SelectItem key={trade} value={trade}>
                            {trade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-900">
                        This is your main trade on TradeHub. It determines the jobs and professionals you see.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isAdmin(currentUser) && (currentUser.primaryTrade || primaryTrade) && (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-lg font-semibold text-gray-900">Additional Trades (Premium Feature)</Label>
                    <p className="mt-1 text-sm text-gray-600">
                      Primary trade can&apos;t be changed after setup. Premium users can add additional trades.
                    </p>
                  </div>
                </div>

                {canMultiTrade ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                      <span className="font-medium">Multi-trade profiles unlocked</span>
                    </div>

                    <div>
                      <Label htmlFor="additionalTrades">Select Additional Trades</Label>
                      <p className="mb-2 mt-1 text-xs text-gray-500">
                        Choose trades beyond your primary trade to receive more job opportunities
                      </p>

                      <Select onValueChange={(v: string) => handleAddAdditionalTrade(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Add a trade" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAdditionalTradeOptions.map((trade: string) => (
                            <SelectItem key={trade} value={trade}>
                              {trade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(currentUser.additionalTrades?.length ?? 0) > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(currentUser.additionalTrades ?? []).map((trade: string) => (
                            <Badge key={trade} variant="secondary" className="text-sm">
                              {trade}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">Multi-trade profiles are a Premium feature.</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Get matched with more jobs by adding additional trades to your profile. Included with Premium.
                    </p>
                    <Link href="/pricing">
                      <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Role used for UI/copy only */}
            {currentUser.role === 'subcontractor' && (
              <div>
                <Label htmlFor="tradesText">Additional Trade Skills</Label>
                <Input
                  id="tradesText"
                  type="text"
                  value={tradesText}
                  onChange={(e) => setTradesText(e.target.value)}
                  placeholder="e.g., Commercial Electrical, Residential Wiring"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: List specific skills or specializations (separate with commas)
                </p>
              </div>
            )}

            {!isAdmin(currentUser) && (
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <Label className="text-lg font-semibold text-gray-900">Custom Search Location (Premium Feature)</Label>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Override your business location for job discovery and tender matching. Your business location remains unchanged.
                    </p>
                  </div>
                </div>

                {canUseSearchFrom ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                      <span className="font-medium">Custom search location unlocked</span>
                    </div>

                    <div>
                      <Label htmlFor="searchLocation">Search From Location</Label>
                      <SuburbAutocomplete
                        value={searchLocation}
                        postcode={searchPostcode}
                        onSuburbChange={setSearchLocation}
                        onPostcodeChange={setSearchPostcode}
                        className="mt-2"
                      />

                      <p className="mt-2 text-xs text-gray-500">
                        Your business location: {currentUser.location ?? 'Not set'}
                        {currentUser.postcode ? `, ${currentUser.postcode}` : ''}
                      </p>

                      {(() => {
                        const origin = getEffectiveSearchOrigin(currentUser as any);
                        if (origin.source !== 'searchFrom' || !origin.location) return null;
                        return (
                          <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs text-blue-900">
                              <strong>Active:</strong> Jobs and tenders are now calculated from {origin.location}
                              {origin.postcode ? `, ${origin.postcode}` : ''}
                            </p>
                          </div>
                        );
                      })()}

                      {(searchLocation || searchPostcode) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchLocation('');
                            setSearchPostcode('');
                          }}
                          className="mt-2"
                        >
                          Clear Custom Location
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Set a virtual search location to discover jobs and tenders in different areas while keeping your business
                      location unchanged.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Lock className="h-4 w-4" />
                      <span>Available on Business Pro and All Access Pro plans</span>
                    </div>
                    <Link href="/pricing">
                      <Button type="button" variant="default" className="bg-purple-600 hover:bg-purple-700">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link href="/profile">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>

          {/* QA_ONLY: dev-only QA panel — not rendered in production */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4 font-mono text-xs">
              <div className="mb-2 font-semibold text-amber-900">QA Panel (dev only)</div>
              <div className="space-y-1 text-gray-700">
                <div>id: {currentUser.id}</div>
                <div>role: {currentUser.role ?? '—'}</div>
                <div>abnStatus: {(currentUser as any).abnStatus ?? '—'}</div>
                <div>canMultiTrade: {String(canMultiTrade)}</div>
                <div>canCustomSearchLocation: {String(canUseSearchFrom)}</div>
                <div>avatar: {currentUser.avatar ? currentUser.avatar : '—'}</div>
                {(Boolean((currentUser as any).searchLocation) ||
                  Boolean((currentUser as any).searchPostcode) ||
                  (currentUser as any).searchLat != null ||
                  (currentUser as any).searchLng != null) && (
                  <>
                    <div>searchLocation: {(currentUser as any).searchLocation ?? '—'}</div>
                    <div>searchPostcode: {(currentUser as any).searchPostcode ?? '—'}</div>
                    <div>searchLat: {(currentUser as any).searchLat ?? '—'}</div>
                    <div>searchLng: {(currentUser as any).searchLng ?? '—'}</div>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  const snapshot = {
                    id: currentUser.id,
                    role: currentUser.role,
                    abnStatus: (currentUser as any).abnStatus,
                    canMultiTrade,
                    canCustomSearchLocation: canUseSearchFrom,
                    avatar: currentUser.avatar,
                    searchLocation: (currentUser as any).searchLocation,
                    searchPostcode: (currentUser as any).searchPostcode,
                    searchLat: (currentUser as any).searchLat,
                    searchLng: (currentUser as any).searchLng,
                    name: currentUser.name,
                    email: currentUser.email,
                  };
                  void navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
                  toast.success('User debug JSON copied');
                }}
              >
                Copy user debug JSON
              </Button>
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
