'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Star,
  Briefcase,
  Calendar,
  Shield,
  CreditCard,
  Info,
  Crown,
  ArrowLeft,
  TestTube,
  RotateCcw,
} from 'lucide-react';

import { AppLayout } from '@/components/app-nav';
import StatusPill from '@/components/status-pill';
import { ReliabilityReviewCard } from '@/components/reliability-review-card';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileCover } from '@/components/profile-cover';
import { ProBadge } from '@/components/pro-badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { isPremiumForDiscovery } from '@/lib/discovery';
import { getStore } from '@/lib/store';
import { buildLoginUrl } from '@/lib/url-utils';
import { shouldShowProBadge } from '@/lib/subscription-utils';
import { BILLING_SIM_ALLOWED, getSimulatedPremium, clearSimulatedPremium } from '@/lib/billing-sim';
import { useSimulatedPremium } from '@/lib/use-simulated-premium';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

export default function ProfilePage() {
  const { session, currentUser, updateUser } = useAuth();
  const router = useRouter();
  const store = useMemo(() => getStore(), []);

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/');
    }
  }, [currentUser, router]);
  const [isSimulated, setSimulated] = useSimulatedPremium();
  const [portalLoading, setPortalLoading] = useState(false);

  // ✅ MUST be above any early returns (rules-of-hooks)
  const memberSinceDate = useMemo(() => {
    const raw = (currentUser as any)?.memberSince;
    const d = raw instanceof Date ? raw : new Date(raw ?? Date.now());
    return isNaN(d.getTime()) ? new Date() : d;
  }, [currentUser]);

  // If not authed, show a simple login prompt
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold text-gray-900">Please log in</h1>
        <p className="mt-2 text-sm text-gray-600">You need to be signed in to view your profile.</p>
        <Link href={buildLoginUrl('/profile')} className="mt-4 inline-block">
          <Button>Go to login</Button>
        </Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting...
      </div>
    );
  }

  const reviews = store.getReviewsByRecipient(currentUser.id);
  const reliabilityReviews = reviews.filter((r: any) => r.isReliabilityReview);
  const standardReviews = reviews.filter((r: any) => !r.isReliabilityReview);

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    store.updateUser(currentUser.id, {
      avatar: `${newAvatarUrl}?v=${Date.now()}`,
    });
  };

  const dashboardPath = isAdmin(currentUser) ? '/admin' : '/dashboard';

  const userForDiscovery = {
    is_premium: currentUser.isPremium ?? undefined,
    subscription_status: currentUser.subscriptionStatus,
    subcontractor_sub_status: undefined,
    active_plan: currentUser.activePlan,
    subcontractor_plan: undefined,
  };
  const isPremiumForDiscoveryCheck = isPremiumForDiscovery(userForDiscovery);
  const showUpgradeNudge = !isPremiumForDiscoveryCheck && !isAdmin(currentUser);

  const showBillingSimulation = BILLING_SIM_ALLOWED;
  const isUsingSimulation = showBillingSimulation && getSimulatedPremium();
  const hasRealPremium = shouldShowProBadge(currentUser);

  const planStatus = (() => {
    if (isUsingSimulation && !hasRealPremium) return 'Premium (Simulated)';
    if (hasRealPremium) return 'Pro Plan';
    return 'Free Plan';
  })();

  const handleResetSimulation = () => {
    clearSimulatedPremium();
    setSimulated(false);
    window.location.reload();
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <Link href={dashboardPath}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Cover banner */}
        <div className="mb-6">
          <ProfileCover
            userId={currentUser.id}
            coverUrl={currentUser.coverUrl ?? undefined}
            onCoverUpdate={async (url) => {
              await updateUser({ coverUrl: url });
            }}
          />
        </div>

        {/* Header card */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-start gap-[28px]">
            <ProfileAvatar
              userId={currentUser.id}
              currentAvatarUrl={currentUser.avatar ?? undefined}
              userName={currentUser.name || 'TradeHub user'}
              onAvatarUpdate={handleAvatarUpdate}
              size={116}
            />

            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{currentUser.name || 'TradeHub user'}</h2>
                <StatusPill type="trust" status={(currentUser.trustStatus ?? 'pending') as import('@/lib/types').TrustStatus} />
                {shouldShowProBadge(currentUser) && <ProBadge size="md" />}
              </div>

              <p className="mb-2 text-gray-600">{currentUser.email}</p>
              {currentUser.businessName ? <p className="text-gray-600">{currentUser.businessName}</p> : null}
              {currentUser.primaryTrade ? (
                <p className="mt-1 text-sm font-medium text-blue-600">Primary Trade: {currentUser.primaryTrade}</p>
              ) : null}
            </div>

            <Link href="/profile/edit">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{currentUser.rating}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
            </div>

            {!!currentUser.reliabilityRating && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{currentUser.reliabilityRating}</div>
                  <div className="text-sm text-gray-600">Reliability</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{currentUser.completedJobs}</div>
                <div className="text-sm text-gray-600">Completed Jobs</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{format(memberSinceDate, 'MMM yyyy')}</div>
                <div className="text-sm text-gray-600">Member Since</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade nudge for free users */}
        {showUpgradeNudge && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
            <p className="font-medium text-blue-800">Want to appear in more searches?</p>
            <p className="mt-1 text-blue-700">
              Upgrade to Premium to increase your discovery radius to 50km.
            </p>
            <Link
              href="/pricing"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              View Premium →
            </Link>
          </div>
        )}

        {/* Bio */}
        {currentUser.bio ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-gray-900">Bio</h3>
            <p className="text-gray-700">{currentUser.bio}</p>
          </div>
        ) : null}

        {/* Trades */}
        {currentUser.trades?.length ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-gray-900">Trade Skills</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.trades.map((trade: string) => (
                <span
                  key={trade}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700"
                >
                  {trade}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Subscription */}
        {/* Role used for UI/copy only, not permissions */}
        {currentUser.role === 'subcontractor' ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Subscription Plan</h3>
              </div>
              {!MVP_FREE_MODE && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    View Plans
                  </Button>
                </Link>
              )}
            </div>

            <div
              className={`flex items-center justify-between rounded-lg p-4 ${
                isUsingSimulation && !hasRealPremium
                  ? 'border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100'
                  : 'border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'
              }`}
            >
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{planStatus}</span>
                  {hasRealPremium && <ProBadge size="sm" />}
                  {isUsingSimulation && !hasRealPremium && (
                    <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                      SIMULATION
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {isUsingSimulation && !hasRealPremium
                    ? 'Testing Premium features (not a real subscription)'
                    : hasRealPremium
                    ? 'Expanded reach, alerts, and tools'
                    : 'Basic access to jobs in your area'}
                </p>
              </div>

              <div className="text-right">
                <div
                  className={`text-2xl font-bold ${
                    isUsingSimulation && !hasRealPremium ? 'text-amber-600' : 'text-blue-600'
                  }`}
                >
                  ${hasRealPremium ? '10' : '0'}
                </div>
                <div className="text-xs text-gray-500">/month</div>
              </div>
            </div>

            {!MVP_FREE_MODE && (
              <div className="mt-4">
                {hasRealPremium ? (
                  <Button
                    className="w-full"
                    disabled={portalLoading}
                    onClick={async () => {
                      setPortalLoading(true);
                      try {
                        const res = await fetch('/api/billing/portal', { method: 'POST' });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data?.url) {
                          window.location.href = data.url;
                          return;
                        }
                        alert(data?.error || 'Could not open billing portal');
                      } finally {
                        setPortalLoading(false);
                      }
                    }}
                  >
                    {portalLoading ? 'Loading…' : 'Manage Subscription'}
                  </Button>
                ) : (
                  <Link href="/pricing">
                    <Button className="w-full">Upgrade to Pro</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Contractor payment placeholder */}
        {/* Role used for UI/copy only */}
        {currentUser.role === 'contractor' ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Payment Settings</h3>
            </div>

            <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="text-sm text-blue-900">
                Payment processing is coming soon. You&apos;ll be able to add payment methods and manage billing here.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Payment Method</label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">No payment method connected</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" disabled>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Connect Payment Method
                </Button>
                <Button variant="outline" disabled>
                  View Billing History
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Billing simulation */}
        {showBillingSimulation ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <TestTube className="h-5 w-5 text-amber-700" />
              <h3 className="font-semibold text-gray-900">Billing Simulation (Testing Only)</h3>
            </div>

            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-4">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                This is for testing Premium features locally. Does not charge money. Not real billing.
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex-1">
                  <div className="mb-1 font-medium text-gray-900">Simulate Premium</div>
                  <p className="text-sm text-gray-600">Test Premium UI gates and features without real subscription</p>
                </div>

                <Switch checked={isSimulated} onCheckedChange={setSimulated} aria-label="Toggle Premium simulation" />
              </div>

              {isSimulated ? (
                <Button variant="outline" size="sm" onClick={handleResetSimulation} className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Simulation
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Reviews */}
        {reviews.length ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Reviews ({reviews.length})</h3>
            <div className="space-y-4">
              {reliabilityReviews.map((review: any) => {
                const author = store.getUserById(review.authorId);
                if (!author) return null;
                return <ReliabilityReviewCard key={review.id} review={review} author={author} />;
              })}

              {standardReviews.map((review: any) => {
                const author = store.getUserById(review.authorId);
                if (!author) return null;
                return <ReliabilityReviewCard key={review.id} review={review} author={author} />;
              })}
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
