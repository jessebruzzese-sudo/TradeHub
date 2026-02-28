'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useAuth } from '@/lib/auth';
import { isAbnVerified, abnLabel } from '@/lib/abn';
import { isAdmin } from '@/lib/is-admin';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';
import { getBrowserSupabase } from '@/lib/supabase-client';

import {
  Calendar,
  Briefcase,
  Users,
  Eye,
  Info,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Search,
  FileText,
  ClipboardList,
  Bell,
  User,
  ShieldCheck,
  Crown,
  Target,
  BadgeCheck,
} from 'lucide-react';


function norm(v?: string | null) {
  return String(v || '').trim().toLowerCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, currentUser, isLoading, refreshUser } = useAuth();

  const hasSession = !!session?.user;

  const role = useMemo(() => norm(currentUser?.role), [currentUser?.role]);
  const isAdminUser = isAdmin(currentUser);
  const isContractor = role === 'contractor';
  const isSubcontractor = role === 'subcontractor';

  const firstName =
    (currentUser?.name || (currentUser as any)?.fullName || (currentUser as any)?.businessName || '').split(' ')[0] ||
    'there';
  const isPublicProfileRaw =
    (currentUser as any)?.is_public_profile ?? (currentUser as any)?.isPublicProfile;

  const isPublicProfile = typeof isPublicProfileRaw === 'boolean' ? isPublicProfileRaw : true;
  const hasLocation = Boolean(
    (currentUser as any)?.location_name ??
      (currentUser as any)?.locationName ??
      (currentUser as any)?.suburb ??
      currentUser?.lat ??
      (currentUser as any)?.location_lat ??
      (currentUser as any)?.search_lat
  );

  const userForDiscovery = useMemo(
    () =>
      currentUser
        ? {
            is_premium: currentUser.isPremium ?? undefined,
            subscription_status: currentUser.subscriptionStatus,
            subcontractor_sub_status: undefined,
            active_plan: currentUser.activePlan,
            subcontractor_plan: undefined,
          }
        : null,
    [currentUser]
  );
  const isPremium = Boolean(isPremiumForDiscovery(userForDiscovery));
  const freeRadiusKm = 20;
  const discoveryLabel = isPremium ? 'Premium radius' : `${freeRadiusKm}km radius`;

  const abnVerified = isAbnVerified(currentUser);
  const abnLabelText = abnLabel(currentUser);

  const planLabel = isPremium ? 'Premium' : 'Free';

  const accountStatusLabel = String(
    (currentUser as any)?.account_status ?? (currentUser as any)?.accountStatus ?? 'active'
  );
  const [stats, setStats] = useState<Record<string, number>>({});
  const profileViews7d = Number((stats as any)?.profileViews7d ?? 0);
  const searchAppearances7d = Number((stats as any)?.searchAppearances7d ?? 0);
  const unreadMessages = Number((stats as any)?.unreadMessages ?? 0);

  useEffect(() => {
    fetch('/api/profile/views-count')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { viewsLast7Days?: number }) => {
        setStats((s) => ({
          ...s,
          profileViews7d: typeof data?.viewsLast7Days === 'number' ? data.viewsLast7Days : 0,
        }));
      })
      .catch(() => {});
  }, []);

  const postJobHref =
    !isAdminUser && !abnVerified
      ? `/verify-business?returnUrl=${encodeURIComponent('/jobs/create')}`
      : '/jobs/create';

  const nextStep = useMemo(() => {
    const encode = (p: string) => encodeURIComponent(p);

    // 1) Missing location
    if (!hasLocation) {
      return {
        key: 'add_location',
        title: 'Add your location',
        description: isPremium
          ? 'Set your base location so we can show you in nearby searches.'
          : 'Free plan includes one base location. Upgrade to add multiple locations and expand visibility.',
        cta: 'Add location',
        href: isPremium ? '/profile/edit' : '/pricing',
        secondaryCta: isPremium ? 'View profile' : 'View plans',
        secondaryHref: isPremium ? '/profile' : '/pricing',
      };
    }

    // 3) ABN not verified (non-admin)
    if (!isAdminUser && !abnVerified) {
      return {
        key: 'verify_abn',
        title: 'Verify your ABN',
        description: 'Verification unlocks posting jobs and applying for tenders.',
        cta: 'Verify ABN',
        href: `/verify-business?returnUrl=${encode('/dashboard')}`,
        secondaryCta: 'Learn more',
        secondaryHref: '/trust',
      };
    }

    // 4) Free plan → Premium
    if (!isPremium) {
      return {
        key: 'view_premium',
        title: 'Increase your visibility',
        description: `You're currently discoverable within ${freeRadiusKm}km. Premium expands your reach.`,
        cta: 'View Premium',
        href: '/pricing',
        secondaryCta: 'Edit profile',
        secondaryHref: '/profile/edit',
      };
    }

    // 5) No forced next step when ready
    return null;
  }, [
    hasLocation,
    isAdminUser,
    abnVerified,
    isPremium,
    freeRadiusKm,
    isContractor,
    postJobHref,
  ]);

  const onTogglePublicProfile = async (value: boolean) => {
    try {
      const supabase = getBrowserSupabase();
      const uid = session?.user?.id || (currentUser as any)?.id;
      if (!supabase || !uid) return;

      const { data, error } = await supabase
        .from('users')
        .update({ is_public_profile: value })
        .eq('id', uid)
        .select('id, is_public_profile')
        .maybeSingle();

      if (error) {
        console.error('toggle public profile update error', error);
        toast.error(error.message || 'Failed to update profile visibility');
        return;
      }

      if (!data?.id) {
        console.error('toggle public profile: no row returned (likely RLS or id mismatch)', { uid, data });
        toast.error('Could not update profile visibility (no row updated).');
        return;
      }

      console.log('toggle result', data);
      await refreshUser?.();
      toast.success(value ? 'Profile is now public' : 'Profile is now private');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile visibility');
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!hasSession) {
      const returnUrl = getSafeReturnUrl('/dashboard', '/dashboard');
      safeRouterReplace(router, `/login?returnUrl=${encodeURIComponent(returnUrl)}`, '/login');
    }
  }, [isLoading, hasSession, router]);

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Premium activated');
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Loading dashboard…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Redirecting to login…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
          <PageHeader title="Dashboard" description="We couldn't load your profile yet." />
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Profile not ready</p>
            <p className="mt-1 text-sm text-amber-800">
              Try again — this can happen briefly while your profile row is being created.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={async () => { try { await refreshUser(); } catch (e) { console.error(e); } }}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">

        {/* Dotted overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Watermark */}
        <img
          src="/TradeHub-Mark-blackout.svg"
          alt=""
          className="pointer-events-none absolute bottom-[-200px] right-[-200px] h-[1600px] w-[1600px] opacity-[0.04]"
        />

        {/* Content container */}
        <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
        {/* Header hero strip */}
        <div className="relative -mx-4 px-4 pb-6 pt-6 sm:rounded-3xl">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-white/60 via-white/30 to-white/60" />
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-200/40 to-transparent"
          />
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Welcome back, {firstName || 'there'}.
                </p>

                {/* Status chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
                    <Target className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-500">Account</span>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold">
                      {accountStatusLabel}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
                    <Crown className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-500">Plan</span>
                    <span
                      className={
                        planLabel === 'Free'
                          ? 'rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold'
                          : 'rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold'
                      }
                    >
                      {planLabel}
                    </span>
                  </div>

                  {!isAdminUser && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
                      <BadgeCheck className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-500">ABN</span>
                      <span
                        className={
                          abnVerified
                            ? 'rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold'
                            : 'rounded-full bg-red-50 text-red-700 border border-red-100 px-2.5 py-0.5 text-xs font-semibold'
                        }
                      >
                        {abnLabelText}
                      </span>
                      {!abnVerified && (
                        <Link
                          href={`/verify-business?returnUrl=${encodeURIComponent('/dashboard')}`}
                          className="ml-1"
                        >
                          <Button size="sm" className="h-7 rounded-full px-3 text-xs gap-2">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
                    <Search className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-500">Discovery</span>
                    <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold">
                      {discoveryLabel}
                    </span>
                  </div>

                  <div
                    className={`inline-flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors
                      ${
                        isPublicProfile
                          ? 'border-slate-200 bg-white/90 text-slate-700'
                          : 'border-red-200 bg-red-50/80 text-slate-700'
                      }
                    `}
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-500 flex items-center gap-1">
                      Profile

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="ml-1 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 transition sm:hidden"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="max-w-[240px]">
                            <p className="text-xs">
                              Private profiles won&apos;t appear in discovery.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          isPublicProfile ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isPublicProfile ? 'Public' : 'Private'}
                      </span>

                      <Switch
                        checked={isPublicProfile}
                        onCheckedChange={onTogglePublicProfile}
                      />
                    </div>
                  </div>

                  {!isPublicProfile && (
                    <p className="mt-2 text-xs text-red-500 sm:text-slate-500">
                      Private profiles won&apos;t appear in discovery.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  className="h-10 rounded-full gap-2 px-5 shadow-md hover:shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all"
                >
                  <Link href="/profile/availability" className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    <Calendar className="h-4 w-4" />
                    List availability
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-6 h-px w-full bg-slate-200/70" />
          </div>
        </div>

        {/* Activation (ABN only) */}
        {!isAdminUser && !abnVerified && (
          <div className="mt-6 rounded-xl border border-red-200/70 bg-red-50/90 backdrop-blur-sm p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  Verify your ABN to unlock posting jobs and applying for tenders.
                </p>
                <p className="mt-1 text-sm text-red-800">
                  Browsing and messaging still works — verification is required for trust-critical actions.
                </p>
                <div className="mt-3">
                  <Link href={`/verify-business?returnUrl=${encodeURIComponent('/dashboard')}`}>
                    <Button size="sm" className="gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Verify now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3) Smart Next Step card */}
        {nextStep && (
          <div className="mt-6">
            <Card className="relative overflow-hidden rounded-2xl bg-white/96 backdrop-blur-md border border-slate-200 shadow-lg">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500/60 to-indigo-500/40" />
              <CardContent className="flex flex-col gap-4 p-6 pl-7 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{nextStep.title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{nextStep.description}</p>
                    {!isPremium && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Free plan: you&apos;re discoverable within {freeRadiusKm}km. Premium expands your reach.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button asChild className="gap-2">
                    <Link href={('href' in nextStep ? nextStep.href : null) || '/dashboard'}>
                      {nextStep.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  {nextStep.secondaryCta && nextStep.secondaryHref && (
                    <Button variant="outline" asChild>
                      <Link href={nextStep.secondaryHref}>{nextStep.secondaryCta}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4) Primary Actions (3 big cards) */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary actions</h3>
          </div>
        </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isContractor && (
              <>
                <ActionCard
                  title="Post a Job"
                  description="Create a job and reach relevant subcontractors."
                  href={postJobHref}
                  icon={<Briefcase className="h-5 w-5" />}
                  badge={!abnVerified ? <Badge variant="secondary">ABN required</Badge> : undefined}
                />
                <ActionCard
                  title="Browse Subcontractors"
                  description="Find available trades near you."
                  href="/subcontractors"
                  icon={<Users className="h-5 w-5" />}
                />
                <ActionCard
                  title="Tenders"
                  description="Create and manage tenders."
                  href="/tenders"
                  icon={<FileText className="h-5 w-5" />}
                  badge={!abnVerified ? <Badge variant="secondary">ABN required</Badge> : undefined}
                />
              </>
            )}
            {isSubcontractor && (
              <>
                <ActionCard
                  title="Find Jobs"
                  description="Browse jobs that match your trade and radius."
                  href="/jobs"
                  icon={<Search className="h-5 w-5" />}
                />
                <ActionCard
                  title="My Applications"
                  description="Track applications and statuses."
                  href="/applications"
                  icon={<ClipboardList className="h-5 w-5" />}
                />
                <ActionCard
                  title="Tenders"
                  description="View and respond to tenders."
                  href="/tenders"
                  icon={<FileText className="h-5 w-5" />}
                  badge={!abnVerified ? <Badge variant="secondary">ABN required</Badge> : undefined}
                />
              </>
            )}
            {isAdminUser && (
              <>
                <ActionCard
                  title="Admin"
                  description="Manage users, reviews and platform settings."
                  href="/admin"
                  icon={<ShieldCheck className="h-5 w-5" />}
                />
                <ActionCard
                  title="Users"
                  description="Search and manage accounts."
                  href="/admin/users"
                  icon={<Users className="h-5 w-5" />}
                />
              </>
            )}
          </div>
        </div>

        {/* 5) Performance (3 cards) */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performance</h3>
          </div>
        </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profileViews7d}</p>
                  <p className="text-xs text-muted-foreground">Profile views (7d)</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{searchAppearances7d}</p>
                  <p className="text-xs text-muted-foreground">Search appearances (7d)</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadMessages}</p>
                  <p className="text-xs text-muted-foreground">Unread messages</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 6) Tools grid (secondary cards) */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</h3>
          </div>
        </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isContractor && (
              <>
                <SecondaryToolCard
                  title="Messages"
                  description="Chat with subcontractors."
                  href="/messages"
                  icon={<MessageSquare className="h-4 w-4" />}
                />
                <SecondaryToolCard
                  title="Applications"
                  description="Review incoming applications."
                  href="/applications"
                  icon={<ClipboardList className="h-4 w-4" />}
                />
                <SecondaryToolCard
                  title="Search"
                  description="Search jobs, tenders, and people."
                  href="/search"
                  icon={<Search className="h-4 w-4" />}
                />
              </>
            )}
            {isSubcontractor && (
              <>
                <SecondaryToolCard
                  title="Messages"
                  description="Chat with contractors."
                  href="/messages"
                  icon={<MessageSquare className="h-4 w-4" />}
                />
                <SecondaryToolCard
                  title="Availability"
                  description="Update your available days."
                  href="/profile/availability"
                  icon={<Calendar className="h-4 w-4" />}
                />
                <SecondaryToolCard
                  title="Profile"
                  description="Update your business profile."
                  href="/profile"
                  icon={<User className="h-4 w-4" />}
                />
              </>
            )}
          </div>
        </div>

        </div>
      </div>
    </AppLayout>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-5 transition hover:border-slate-300 hover:shadow-md hover:-translate-y-[2px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-200">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              {badge}
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
      </div>
    </Link>
  );
}

function SecondaryToolCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="group">
      <Card className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md transition hover:shadow-lg">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{title}</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
