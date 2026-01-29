'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, Lock, MapPin } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
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
import { TRADE_CATEGORIES } from '@/lib/trades';
import { hasSubcontractorPremium, hasBuilderPremium, hasContractorPremium } from '@/lib/capability-utils';

/**
 * This page is written to be compatible with the current state of your backend:
 * - `public.users` does NOT (yet) have columns for businessName/abn/location/postcode/trades/primaryTrade/etc.
 * - auth-context keeps those fields on `currentUser` for UI compatibility, but only persists name/role/bio/avatar.
 *
 * So on this page:
 * - we treat these fields as "UI-only" for now (they'll persist once you add DB columns + map them in auth-context).
 * - we avoid relying on DB writes for fields that don't exist yet.
 */

export default function EditProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const router = useRouter();

  // capability-utils expects a stricter User type (e.g., name: string). Provide a safe shim.
  const userForCaps = useMemo(() => {
    if (!currentUser) {
      return {
        name: '',
        role: '',
      } as any;
    }

    return {
      ...(currentUser as any),
      name: currentUser.name ?? '',
      role: currentUser.role ?? '',
    };
  }, [currentUser]);

  // Controlled values (strings only)
  const [name, setName] = useState<string>(currentUser?.name ?? '');
  const [businessName, setBusinessName] = useState<string>(currentUser?.businessName ?? '');
  const [bio, setBio] = useState<string>(currentUser?.bio ?? '');
  const [primaryTrade, setPrimaryTrade] = useState<string>(currentUser?.primaryTrade ?? '');

  // free-text skills field (comma separated)
  const [tradesText, setTradesText] = useState<string>((currentUser?.trades ?? []).join(', '));

  // Premium "search from" (UI-only for now). We store in memory.
  const [searchLocation, setSearchLocation] = useState<string>(((currentUser as any)?.searchLocation as string) ?? '');
  const [searchPostcode, setSearchPostcode] = useState<string>(((currentUser as any)?.searchPostcode as string) ?? '');

  const [isSaving, setIsSaving] = useState(false);

  // Premium checks
  const canMultiTrade = hasSubcontractorPremium(userForCaps as any) || !!currentUser?.additionalTradesUnlocked;
  const canCustomSearchLocation = hasBuilderPremium(userForCaps as any) || hasContractorPremium(userForCaps as any);

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

  // Avoid rendering controlled inputs before user exists
  if (!currentUser) return null;

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      await updateUser({ avatar: newAvatarUrl });
      toast.success('Avatar updated');
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
    if (!primaryTrade.trim() && currentUser.role !== 'admin') {
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
      await updateUser({
        name: name.trim() ? name.trim() : undefined,
        bio: bio.trim() ? bio.trim() : undefined,

        // UI-only fields for now (safe because auth-context merges them into state)
        businessName: businessName.trim() ? businessName.trim() : undefined,
        primaryTrade: primaryTrade.trim() ? primaryTrade.trim() : undefined,
        trades: parsedTrades.length > 0 ? parsedTrades : undefined,

        // UI-only custom search location
        location: searchLocation.trim() ? searchLocation.trim() : undefined,
        postcode: searchPostcode.trim() ? searchPostcode.trim() : undefined,

        // Store UI-only search fields too (not typed on CurrentUser; but updateUser accepts Partial and merges)
        // If you dislike `as any`, remove these two lines and just rely on location/postcode for now.
        ...(searchLocation ? ({ searchLocation: searchLocation.trim() } as any) : null),
        ...(searchPostcode ? ({ searchPostcode: searchPostcode.trim() } as any) : null),
      } as any);

      toast.success('Profile updated successfully');
      router.push('/profile');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const dashboardHref =
    currentUser.role === 'contractor' ? '/dashboard/contractor' : '/dashboard/subcontractor';

  return (
    <TradeGate>
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

              {currentUser.role !== 'admin' && (
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
                  <p className="mt-1 text-xs text-gray-500">
                    (Will persist once business fields are added to the database.)
                  </p>
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

              {currentUser.role !== 'admin' && (
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

              {currentUser.role !== 'admin' && (currentUser.primaryTrade || primaryTrade) && (
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

              {currentUser.role !== 'admin' && (
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <Label className="text-lg font-semibold text-gray-900">
                          Custom Search Location (Premium Feature)
                        </Label>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Override your business location for job discovery and tender matching. Your business location
                        remains unchanged.
                      </p>
                    </div>
                  </div>

                  {canCustomSearchLocation ? (
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

                        {searchLocation && (
                          <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs text-blue-900">
                              <strong>Active:</strong> Jobs and tenders are now calculated from {searchLocation}
                              {searchPostcode ? `, ${searchPostcode}` : ''}
                            </p>
                          </div>
                        )}

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
                        Set a virtual search location to discover jobs and tenders in different areas while keeping your
                        business location unchanged.
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
          </form>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
