'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, MapPin, Globe } from 'lucide-react';
import { SiInstagram, SiFacebook, SiLinkedin, SiTiktok, SiYoutube } from 'react-icons/si';

import { AppLayout } from '@/components/app-nav';
import { ProfileAvatar } from '@/components/profile-avatar';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { isAdmin } from '@/lib/is-admin';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { hasSubcontractorPremium } from '@/lib/capability-utils';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

export default function EditProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/');
    }
  }, [currentUser, router]);

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
  const [businessName, setBusinessName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [primaryTrade, setPrimaryTrade] = useState<string>('');
  const [isPublicProfile, setIsPublicProfile] = useState<boolean>(false);

  // free-text skills field (comma separated)
  const [tradesText, setTradesText] = useState<string>('');

  // Links (website + socials)
  const [website, setWebsite] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [facebook, setFacebook] = useState<string>('');
  const [linkedin, setLinkedin] = useState<string>('');
  const [tiktok, setTiktok] = useState<string>('');
  const [youtube, setYoutube] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  // Hydrate form state once user is available (and on user switch)
  useEffect(() => {
    if (!currentUser) return;

    setName(currentUser.name ?? '');
    setBusinessName(currentUser.businessName ?? '');
    setBio(currentUser.bio ?? '');
    setPrimaryTrade((currentUser.primaryTrade as string | undefined) ?? ((currentUser as any)?.trades?.[0] as string | undefined) ?? '');
    setIsPublicProfile(currentUser.isPublicProfile ?? false);

    setTradesText(((currentUser.trades ?? []) as string[]).join(', '));

    setWebsite((currentUser as any)?.website ?? '');
    setInstagram((currentUser as any)?.instagram ?? '');
    setFacebook((currentUser as any)?.facebook ?? '');
    setLinkedin((currentUser as any)?.linkedin ?? '');
    setTiktok((currentUser as any)?.tiktok ?? '');
    setYoutube((currentUser as any)?.youtube ?? '');
  }, [currentUser]);

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
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  const isAbnVerified = (currentUser.abnStatus || '').toString().toUpperCase() === 'VERIFIED';
  const abnVerified = !!currentUser?.abnVerified || String(currentUser?.abnStatus || '').toUpperCase() === 'VERIFIED';
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
  const showAbnOnProfile = currentUser?.showAbnOnProfile === true;
  const showBusinessNameOnProfile = currentUser?.showBusinessNameOnProfile !== false;
  const businessNameDisplay = (verifiedEntityName ?? currentUser?.businessName ?? '').toString();

  const primaryTradeValue =
    ((currentUser as any)?.trades?.[0] as string | undefined) ??
    primaryTrade ??
    '';

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

          website: normalizeWebsite(website) || undefined,
          instagram: instagram.trim() ? normalizeInstagram(instagram) : undefined,
          facebook: facebook.trim() ? normalizeFacebook(facebook) : undefined,
          linkedin: linkedin.trim() ? normalizeLinkedin(linkedin) : undefined,
          tiktok: tiktok.trim() ? normalizeTiktok(tiktok) : undefined,
          youtube: youtube.trim() ? normalizeYoutube(youtube) : undefined,

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
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-800">Email</Label>
                <Input id="email" type="email" value={currentUser.email ?? ''} disabled className={`${inputClass} bg-slate-50`} />
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">Links</h3>
                        <span className="text-[11px] font-semibold text-slate-500">
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

                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 transition">
                      <span className={`text-base transition-transform ${linksOpen ? 'rotate-180' : ''}`}>⌄</span>
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
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-700">Preview</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {buildPreviewLinks().length === 0 ? (
                      <span className="text-xs text-slate-500">No links added yet.</span>
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
              </div>
            </div>
          </div>

          {!isAdmin(currentUser) && (
          <div className={cardClass}>
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
                    className="flex-1 bg-slate-50 border-slate-200"
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
                      <Button
                        type="button"
                        className="
                          group
                          relative
                          rounded-xl
                          px-5 py-2.5
                          font-semibold
                          text-black
                          bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500
                          shadow-lg shadow-amber-500/40
                          transition-all duration-200
                          hover:shadow-xl hover:shadow-amber-500/60
                          hover:-translate-y-0.5
                          hover:scale-[1.03]
                          active:scale-[0.98]
                        "
                      >
                        <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
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
          <div className={cardClass}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Location / Service area</h2>
              <p className="text-xs text-slate-600">Where you&apos;re based and where you can work.</p>
            </div>
            <div className="space-y-3">
              {(() => {
                const locationLabel =
                  typeof currentUser?.location === 'string' && currentUser.location.trim().length > 0
                    ? currentUser.location.trim()
                    : null;
                return (
              <div className={`${innerBubbleClass} flex items-center justify-between gap-4`}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {locationLabel ?? 'Location not set'}
                    {currentUser.postcode ? `, ${currentUser.postcode}` : ''}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {locationLabel
                      ? 'This is the area you selected during signup.'
                      : 'Set your base suburb to improve local matching.'}
                  </p>
                </div>

                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 border border-slate-200">
                  <MapPin className="h-5 w-5 text-slate-500" />
                </div>
              </div>
                );
              })()}
            </div>
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
                ABN is only required for posting jobs and tendering. You can verify anytime.
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
                    onClick={() => updateUser({ showAbnOnProfile: !showAbnOnProfile })}
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
                    onClick={() => updateUser({ showBusinessNameOnProfile: !showBusinessNameOnProfile })}
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
                  This will remove your profile info, avatar/cover, and soft-delete your jobs and tenders.
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
                    messages, jobs, tenders, and reviews — will be permanently deleted.
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
