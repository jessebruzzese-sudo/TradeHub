'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, MapPin, Globe } from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import { ProfileAvatar } from '@/components/profile-avatar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  const [isPublicProfile, setIsPublicProfile] = useState<boolean>(false);

  // free-text skills field (comma separated)
  const [tradesText, setTradesText] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  // Hydrate form state once user is available (and on user switch)
  useEffect(() => {
    if (!currentUser) return;

    setName(currentUser.name ?? '');
    setBusinessName(currentUser.businessName ?? '');
    setBio(currentUser.bio ?? '');
    setPrimaryTrade((currentUser.primaryTrade as string | undefined) ?? ((currentUser as any)?.trades?.[0] as string | undefined) ?? '');
    setIsPublicProfile(currentUser.isPublicProfile ?? false);

    setTradesText(((currentUser.trades ?? []) as string[]).join(', '));
  }, [currentUser]);

  // Sync businessName when ABN is verified (keeps locked display value aligned with state)
  useEffect(() => {
    if (!currentUser) return;
    const verified = (currentUser.abnStatus || '').toString().toUpperCase() === 'VERIFIED';
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

  const isAbnVerified = (currentUser.abnStatus || '').toString().toUpperCase() === 'VERIFIED';
  const verifiedEntityName =
    (currentUser as any)?.abnEntityName ??
    (currentUser as any)?.abn_entity_name ??
    currentUser.businessName ??
    null;
  const verifiedAbnNumber =
    (currentUser as any)?.abn ??
    (currentUser as any)?.abn_number ??
    null;

  const primaryTradeValue =
    ((currentUser as any)?.trades?.[0] as string | undefined) ??
    primaryTrade ??
    '';

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

    const effectivePrimaryTrade =
      (((currentUser as any)?.trades?.[0] as string | undefined) ??
        currentUser.primaryTrade ??
        primaryTrade ??
        '').toString();

    // Primary trade is required for non-admins
    if (!effectivePrimaryTrade.trim() && !isAdmin(currentUser)) {
      toast.error('Please select your primary trade');
      return;
    }

    setIsSaving(true);

    try {
      /**
       * IMPORTANT:
       * - Only name/bio/avatar/role are persisted today.
       * - Everything else is merged in-memory by auth-context so the UI stays consistent.
       * - Free-text "Additional Trade Skills" (parsedTrades) is NOT persisted to trades (profile copy only).
       */
      await updateUser(
        {
          name: name.trim() ? name.trim() : undefined,
          bio: bio.trim() ? bio.trim() : undefined,

          // UI-only fields for now (safe because auth merges them into state)
          businessName: isAbnVerified ? undefined : (businessName.trim() ? businessName.trim() : undefined),
          primaryTrade: effectivePrimaryTrade.trim() ? effectivePrimaryTrade.trim() : undefined,
          isPublicProfile,

          location: undefined,
          postcode: undefined,
        } as any
      );

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
      <div className="relative min-h-screen overflow-x-hidden bg-[#2563eb]">
        {/* Watermark layer (matches Pricing/Signup vibe) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.15]"
        >
          <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute -right-24 top-24 h-[560px] w-[560px] opacity-90">
            <img
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
          <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-120px] right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-6">
          <form onSubmit={handleSave} className="space-y-6">
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
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
          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Basic details</h2>
              <p className="text-xs text-slate-600">Name, contact, and business information.</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-slate-800">Profile Photo</Label>
                <div className="mt-2">
                  <ProfileAvatar
                    userId={currentUser.id}
                    currentAvatarUrl={currentUser.avatar ?? undefined}
                    userName={currentUser.name ?? 'User'}
                    onAvatarUpdate={handleAvatarUpdate}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">Click to upload a new photo (max 5MB)</p>
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
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-800">Email</Label>
                <Input id="email" type="email" value={currentUser.email ?? ''} disabled className="mt-1 bg-gray-50" />
                <p className="mt-1 text-xs text-slate-600">Email cannot be changed</p>
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
                    className={`mt-1 ${isAbnVerified ? 'bg-slate-50' : ''}`}
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
            </div>
          </div>

          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
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
                className="mt-1"
              />
              </div>
            </div>
          </div>

          {!isAdmin(currentUser) && (
          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Trades</h2>
              <p className="text-xs text-slate-600">Your primary trade and skills for job matching.</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-slate-800">
                  Primary Trade <span className="text-red-500">*</span>
                </Label>

                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={primaryTradeValue}
                    disabled
                    className="flex-1 bg-slate-50"
                  />
                  <Lock className="h-5 w-5 flex-shrink-0 text-slate-400" />
                </div>

                <p className="mt-2 text-xs text-slate-600">
                  Your primary trade is set during signup and can&apos;t be changed.
                </p>

                {/* Premium upsell */}
                <div className="mt-3 relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-4 shadow-sm">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                  <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-orange-200/30 blur-2xl" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-amber-900">
                        Upgrade to Premium for multiple trades
                      </div>
                      <div className="mt-1 text-xs text-amber-900/80">
                        Add additional trades to appear in more searches and get matched with more work.
                      </div>
                    </div>

                    <Link href="/pricing">
                      <Button type="button" className="bg-amber-500 text-black hover:bg-amber-400">
                        Upgrade
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {primaryTradeValue && (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                    <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-slate-800">
                      {MVP_FREE_MODE ? 'Additional Trades' : 'Additional Trades (Premium Feature)'}
                    </Label>
                    <p className="mt-1 text-xs text-slate-600">
                      Primary trade can&apos;t be changed after setup. Premium users can add additional trades.
                    </p>
                  </div>
                </div>

                {canMultiTrade ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                      <span className="font-medium">Multi-trade profiles unlocked</span>
                    </div>

                    <div>
                      <Label htmlFor="additionalTrades" className="text-sm font-medium text-slate-800">Select Additional Trades</Label>
                      <p className="mb-2 mt-1 text-xs text-slate-600">
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {MVP_FREE_MODE ? 'Multi-trade profiles — Coming soon' : 'Multi-trade profiles are a Premium feature.'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
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
                <Label htmlFor="tradesText" className="text-sm font-medium text-slate-800">Additional Trade Skills</Label>
                <Input
                  id="tradesText"
                  type="text"
                  value={tradesText}
                  onChange={(e) => setTradesText(e.target.value)}
                  placeholder="e.g., Commercial Electrical, Residential Wiring"
                  className="mt-1"
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
          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Location / Service area</h2>
              <p className="text-xs text-slate-600">Where you&apos;re based and where you can work.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 opacity-75">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Custom Search Location (Coming soon)</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Soon you&apos;ll be able to set a virtual search location to discover jobs and tenders in different areas
                    while keeping your business location unchanged.
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {!isAdmin(currentUser) && (
          <div id="public-profile" className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
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

          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Verification</h2>
              <p className="text-xs text-slate-600">
                ABN is only required for posting jobs and tendering. You can verify anytime.
              </p>

              {isAbnVerified && (verifiedEntityName || verifiedAbnNumber) ? (
                <div className="mt-2 text-xs text-slate-700">
                  <span className="font-semibold">Verified as:</span>{' '}
                  <span className="font-semibold">{verifiedEntityName ?? 'Business'}</span>
                  {verifiedAbnNumber ? <span className="text-slate-500"> • {verifiedAbnNumber}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border bg-slate-50 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">ABN verification</span>

                  {isAbnVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <span>✅</span> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <span>⏳</span> Optional
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-600">
                  {verifiedEntityName || verifiedAbnNumber ? (
                    <span>
                      {verifiedEntityName ?? 'ABN'}
                      {verifiedAbnNumber ? ` • ${verifiedAbnNumber}` : ''}
                    </span>
                  ) : (
                    <span>No ABN saved yet.</span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => router.push('/verify-business')}
              >
                {isAbnVerified ? 'View' : 'Verify'}
              </Button>
            </div>
          </div>

        </form>
        </div>
      </div>
    </AppLayout>
  );
}
