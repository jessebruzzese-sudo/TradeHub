'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, Lock, MapPin } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { ProfileAvatar } from '@/components/profile-avatar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { hasSubcontractorPremium } from '@/lib/capability-utils';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

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

  const [isSaving, setIsSaving] = useState(false);

  // Hydrate form state once user is available (and on user switch)
  useEffect(() => {
    if (!currentUser) return;

    setName(currentUser.name ?? '');
    setBusinessName(currentUser.businessName ?? '');
    setBio(currentUser.bio ?? '');
    setPrimaryTrade(currentUser.primaryTrade ?? '');

    setTradesText(((currentUser.trades ?? []) as string[]).join(', '));
  }, [currentUser]);

  // Premium checks
  const canMultiTrade = currentUser ? hasSubcontractorPremium(currentUser) || !!currentUser.additionalTradesUnlocked : false;

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

          location: undefined,
          postcode: undefined,
        } as any
      );

      toast.success('Profile updated successfully');
      router.push('/profile');
    } catch (error) {
      console.error('Profile save failed', error);
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
                    <p className="mt-2 text-xs text-gray-500">Your primary trade is locked for now.</p>
                    <p className="text-xs text-gray-500">Add multiple trades (coming soon).</p>
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
                    <Label className="text-lg font-semibold text-gray-900">
                      {MVP_FREE_MODE ? 'Additional Trades' : 'Additional Trades (Premium Feature)'}
                    </Label>
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
                      <span className="text-sm font-medium">
                        {MVP_FREE_MODE ? 'Multi-trade profiles — Coming soon' : 'Multi-trade profiles are a Premium feature.'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {MVP_FREE_MODE
                        ? 'Multi-trade support will be available as part of Premium later. For now, your primary trade is used for matching.'
                        : 'Get matched with more jobs by adding additional trades to your profile. Included with Premium.'}
                    </p>
                    {!MVP_FREE_MODE && (
                      <Link href="/pricing">
                        <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700">
                          Upgrade to Premium
                        </Button>
                      </Link>
                    )}
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 opacity-75">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                  <div>
                    <Label className="text-lg font-semibold text-gray-500">Custom Search Location (Coming soon)</Label>
                    <p className="mt-2 text-sm text-gray-500">
                      Soon you&apos;ll be able to set a virtual search location to discover jobs and tenders in different areas
                      while keeping your business location unchanged.
                    </p>
                  </div>
                </div>
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
  );
}
