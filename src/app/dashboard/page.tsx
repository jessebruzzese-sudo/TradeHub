// vim: ts=2
'use client';
import React, { useEffect, useMemo, useState, useContext } from 'react';
import UserContext from "@/lib/user-context";
import UserProvider from "@/components/hoc/UserProvider";
import Link from 'next/link';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getAxios } from "@/lib/utils";
import { AppLayout } from '@/components/app-nav';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useActivityPing } from "@/hooks/useActivityPing";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isAdmin } from "@/lib/is-admin";
import { useDevUnread } from '@/lib/dev-unread-context';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getPrimaryUserCoordinates } from '@/lib/location/get-user-coordinates';
import { getSafeReturnUrl, safeRouterReplace } from '@/lib/safe-nav';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { canCreateJob } from '@/lib/permissions';
import { JOB_POST_CONTRACTOR_ROLE_MESSAGE } from '@/lib/jobs/job-post-role-messages';
import { startOfDay, isAfter, format } from 'date-fns';
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
  ClipboardList,
  Bell,
  User,
  ShieldCheck,
  Crown,
  Target,
  BadgeCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { primaryButtonClass } from '@/components/ui/primary-button';

function norm(v?: string | null) {
  return String(v || '').trim().toLowerCase();
}

function StatusChipsContent({
  accountStatusLabel,
  planLabel,
  isAdminUser,
  abnVerified,
  abnLabelText,
  discoveryLabel,
  nextAvailableLabel,
  availLoading,
  isPublicProfile,
  onTogglePublicProfile,
}: {
  accountStatusLabel: string;
  planLabel: string;
  isAdminUser: boolean;
  abnVerified: boolean;
  abnLabelText: string;
  discoveryLabel: string;
  nextAvailableLabel: string | null;
  availLoading: boolean;
  isPublicProfile: boolean;
  onTogglePublicProfile: (value: boolean) => void;
}) {
	const [checked, setChecked] = useState<boolean>(isPublicProfile);
  return (
    <>
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
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Why verify ABN?"
                  className="ml-1.5 inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-slate-600 transition-colors hover:text-slate-800 focus:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className="max-w-[220px]">
                <p className="text-xs">
                  You can post jobs without ABN verification; optional verification builds trust
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

      <Link
        href="/profile/availability"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white hover:shadow-md"
      >
        <Calendar className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-slate-500">Availability</span>
        <span
          className={
            nextAvailableLabel
              ? 'rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold'
              : 'rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold'
          }
        >
          {availLoading ? 'Loading…' : nextAvailableLabel ? nextAvailableLabel : 'Not listed'}
        </span>
      </Link>

      <div
        className={`inline-flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors
          ${
							checked
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
                  className="ml-1 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 transition"
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
              checked ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {checked ? 'Public' : 'Private'}
          </span>
          <Switch
            checked={checked}
            onCheckedChange={()=>{onTogglePublicProfile(!checked);setChecked(!checked);}}
          />
        </div>
      </div>

      {!checked && (
        <p className="mt-2 w-full text-xs text-red-500 sm:text-slate-500">
          Private profiles won&apos;t appear in discovery.
        </p>
      )}
    </>
  );
}

export default function DashboardPage() {

  const router = useRouter();
  const searchParams = useSearchParams();
	const UserSession = useContext(UserContext);
	const apiClient = getAxios(null);
	
	{/* STATE */}
	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
  const [statusAccordionOpen, setStatusAccordionOpen] = useState(false);
  const [locationUpsellOpen, setLocationUpsellOpen] = useState(false);
  const [availDates, setAvailDates] = useState<string[]|null>(null);
  const [availLoading, setAvailLoading] = useState(true);
  const [savedLocations, setSavedLocations] = useState<{ id: string }[] | null>(null);
	const [statistics, setStatistics] = useState<any|null>(null);
	const [triggerActive, setTriggerActive] = useState<boolean>(true);

	{/*  DERIVED STATE */}
	const isLoading = currentUser === null;
  const profileViews7d = statistics?.profileViews7d ?? 0; 
  const unreadMessages = statistics?.unreadMessages ?? 0; 
  const newJobsCount = statistics?.newJobsCount ?? 0;
  const accountStatusLabel = currentUser?.accountStatus ?? "loading"; 
  const isPremium = currentUser?.profile?.premium ?? false;

  const hasLocation = useMemo(() => {
    if (!currentUser) return false;
    if ((currentUser?.business?.location ?? '').trim()) return true;
  }, [currentUser]);

	const role = currentUser?.role ?? "unknown";
  const isAdminUser = role?.toLowerCase() === "admin";
  // Admin accounts should retain full operator dashboard actions.
  const showContractorSections = true;
  const canPostJobListing = true;
  const savedLocationsCount = ( hasLocation ? 1 : 0 ) + (savedLocations ?? []).length;
  const hasMultipleLocations = savedLocationsCount >= 2;
  const freeRadiusKm = 20;
  const discoveryLabel = isPremium ? 'Premium radius' : `${freeRadiusKm}km radius`;
  const abnVerified = currentUser?.business?.abnVerified ?? false;
  const abnLabelText = currentUser?.business?.abn ?? "";
  const planLabel = isPremium ? 'Premium' : 'Free';
  const firstName = ( 
		currentUser?.visibleName || 
		currentUser?.name || 
		currentUser?.business?.businessName ||
		"").split(' ')[0];

	// hook to load dates	
	useEffect(()=>{
		if(availDates !== null){
			return;
		}
 		apiClient.get("/api/me/availability").then((response_)=>{
			const data = response_.data;
			const dates = data.dates;
			setAvailDates(dates);
			setAvailLoading(false);	
		});
	}, [availDates]);
	
	// update  last active timestamp
	useActivityPing(triggerActive, (result:boolean)=>{setTriggerActive(result);});
	
	// take memo of most recent upcoming
	// date of availability
	const nextAvailable = useMemo(() => {
		if(availDates === null){
			return;
		}
    const today = startOfDay(new Date());
    const future = availDates
      .map((d) => new Date(d))
      .filter((d) => !isAfter(today, d)); // d >= today
    if (future.length === 0) return null;
    future.sort((a, b) => a.getTime() - b.getTime());
    return future[0];
  }, [availDates]);

	// format the next available date
  const nextAvailableLabel = useMemo(() => {
    return nextAvailable ? format(nextAvailable, 'EEE d MMM') : null;
  }, [nextAvailable]);

  const nextStep = useMemo(() => {
    const encode = (p: string) => encodeURIComponent(p);
    // 1) Add locations (0 or 1 saved) — hide when user already has 2+ locations
    if (!hasMultipleLocations) {
      return {
        key: 'add_location',
        title: 'Add multiple locations',
        description: isPremium
          ? 'Set your base location so we can show you in nearby searches.'
          : 'Free plan includes one base location. Upgrade to add multiple locations and expand visibility.',
        cta: 'Add location',
        href: isPremium ? '/profile/edit#location' : '/pricing',
      };
    }

    // 2) ABN not verified (non-admin) — optional trust step
    if (!isAdminUser && !abnVerified) {
      return {
        key: 'verify_abn',
        title: 'Verify your ABN (optional)',
        description:
          'You can post jobs without ABN verification. Verification is optional for posting and acts as a trust signal; applying to jobs others post still requires a verified ABN.',
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
    hasMultipleLocations,
    isAdminUser,
    abnVerified,
    isPremium,
    freeRadiusKm
  ]);

	{ /* START HOOKS */ }
	
  useEffect(() => {
		if(currentUser === null){
			return;
		}
		if(statistics !== null){
			return;
		}
		getAxios(null).get(`/api/profile/${currentUser.profile.id}/statistics`).
			then(async(response_)=>{
				const data = response_.data;
				const response__ = await getAxios(null).get(`/api/me/jobs/search`);
				const jobs_ = response__?.data ?? [];
				const openJobs_ = jobs_.filter((x)=>x.status === "open");
				setStatistics({...data, newJobsCount: openJobs_?.length ?? 0});
			}).catch((err_)=>{
				const msg  = err_?.response?.data?.error ?? null;
				if(msg){
					toast.error(msg);
				}
			});
  }, [statistics, currentUser]);

  const onTogglePublicProfile = async (value:boolean) => {
    try {
			currentUser.public = value;
			const payload = {"public": value};
			await apiClient.put(`/api/me/visibility`, payload);
      toast.success(value ? 'Profile is now public' : 'Profile is now private');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile visibility');
    }
  };

  useEffect(() => {
    const upgraded = searchParams.get('upgraded') === '1' || searchParams.get('upgrade') === 'success';
    if (upgraded) {
      toast.success('Premium activated');
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, router]);

	{ /*END HOOKS */ }
	
  if (isLoading) {
    return (
			<UserProvider onUserLoaded={(user)=>{setCurrentUser(user);}}>
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        Loading dashboard…
      </div>
			</UserProvider>
    );
  }

  return (
    <AppLayout>
			<UserProvider onUserLoaded={(user)=>{setCurrentUser(user);}}>
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

        {/* Content container — tight top on mobile under sticky header; desktop keeps prior rhythm */}
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-8 pt-2 md:py-8">
        {/* Header hero strip */}
        <div className="relative -mx-4 px-4 pb-6 pt-2 md:pt-6 sm:rounded-3xl">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-white/60 via-white/30 to-white/60" />
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] bg-gradient-to-b from-blue-200/40 to-transparent"
          />
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-600">
                      Welcome back, {firstName || 'there'}.
                    </p>
                  </div>
                  <UserAvatar
                    avatarUrl={(currentUser as any)?.avatar ?? undefined}
                    userName={currentUser?.name || (currentUser as any)?.businessName || 'User'}
                    size="xl"
                    className="shrink-0 md:hidden"
                  />
                </div>

                {/* Status chips — mobile: collapsible accordion; desktop: always expanded */}
                <div className="mt-4">
                  {/* Mobile: collapsible accordion */}
                  <div className="md:hidden">
                    <Collapsible open={statusAccordionOpen} onOpenChange={setStatusAccordionOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-left shadow-sm transition-colors hover:bg-white/95 hover:border-slate-300 active:bg-slate-50"
                        >
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <p className="text-sm font-medium text-slate-900">Account status</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Profile + visibility dot */}
                            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                              Profile
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  currentUser.public ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                                aria-hidden
                              />
                            </span>
                            {/* Free chip */}
                            <span
                              className={
                                planLabel === 'Free'
                                  ? 'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700'
                                  : 'inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700'
                              }
                            >
                              <Crown className="h-3 w-3 shrink-0" />
                              {planLabel}
                            </span>
                            {/* Unverified chip (non-admin only) */}
                            {!isAdminUser && !abnVerified && (
                              <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                {abnLabelText}
                              </span>
                            )}
                            </div>
                          </div>
                          <span className="shrink-0 text-slate-400" aria-hidden>
                            {statusAccordionOpen ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/60 p-3">
                          <StatusChipsContent
                            accountStatusLabel={accountStatusLabel}
                            planLabel={planLabel}
                            isAdminUser={isAdminUser}
                            abnVerified={abnVerified}
                            abnLabelText={abnLabelText}
                            discoveryLabel={discoveryLabel}
                            nextAvailableLabel={nextAvailableLabel}
                            availLoading={availLoading}
                            isPublicProfile={currentUser.public}
                            onTogglePublicProfile={onTogglePublicProfile}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* Desktop: always expanded */}
                  <div className="hidden md:flex flex-wrap gap-2">
                    <StatusChipsContent
                      accountStatusLabel={accountStatusLabel}
                      planLabel={planLabel}
                      isAdminUser={isAdminUser}
                      abnVerified={abnVerified}
                      abnLabelText={abnLabelText}
                      discoveryLabel={discoveryLabel}
                      nextAvailableLabel={nextAvailableLabel}
                      availLoading={availLoading}
                      isPublicProfile={currentUser.public}
                      onTogglePublicProfile={onTogglePublicProfile}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild className={primaryButtonClass}>
                  <Link href="/profile/availability" className="flex items-center gap-2">
                    {!nextAvailableLabel && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                    )}
                    <Calendar className="h-4 w-4" />
                    {nextAvailableLabel ? 'Update availability' : 'List availability'}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-6 h-px w-full bg-slate-200/70" />
          </div>
        </div>
        {/* 4) Primary Actions (3 big cards) */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary actions</h3>
          </div>
        </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showContractorSections && (
              <>
                <ActionCard
                  title="Post a Job"
                  description={
                    canPostJobListing
                      ? 'Create a job and reach relevant trades people.'
                      : JOB_POST_CONTRACTOR_ROLE_MESSAGE
                  }
                  href={canPostJobListing ? '/jobs/create' : '/jobs'}
                  icon={<Briefcase className="h-5 w-5" />}
                  disabled={!canPostJobListing}
                  disabledHint={!canPostJobListing ? JOB_POST_CONTRACTOR_ROLE_MESSAGE : undefined}
                />
                <ActionCard
                  title="Browse Profiles"
                  description="Find available trades near you."
                  href="/subcontractors"
                  icon={<Users className="h-5 w-5" />}
                />
                <ActionCard
										title="My Profile"
                   	description="View and edit your professional details."
                    href="/profile"
                    icon={<User className="h-5 w-5" />}
                  />
              </>
            )}
            {!isAdminUser && (
							<>
                <ActionCard
                  title="Find Jobs"
                  description="Browse jobs that match your trade and radius."
                  href="/jobs"
                  icon={<Search className="h-5 w-5" />}
                />
                <ActionCard
                  title="My Works"
                  description="Let people know about your previous works."
                  href="/works"
                  icon={<User className="h-5 w-5" />}
                />
                <ActionCard
                  title="Availability"
                  description="Update your available days."
                  href="/profile/availability"
                  icon={<Calendar className="h-4 w-4" />}
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
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{newJobsCount}</p>
                  <p className="text-xs text-muted-foreground">Open jobs in your area</p>
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
            {showContractorSections && (
              <>
                <SecondaryToolCard
                  title="Messages"
                  description="Chat with subcontractors."
                  href="/messages"
                  icon={<MessageSquare className="h-4 w-4" />}
                />
              </>
            )}
          </div>
        </div>
        </div>
      </div>
		</UserProvider>
    </AppLayout>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
  badge,
  disabled,
  disabledHint,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const body = (
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
  );

  if (disabled) {
    return (
      <div
        className="group cursor-not-allowed rounded-2xl border border-slate-200 bg-white/95 p-5 opacity-60 backdrop-blur-md"
        title={disabledHint}
        aria-disabled
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-5 transition hover:border-slate-300 hover:shadow-md hover:-translate-y-[2px]"
    >
      {body}
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
