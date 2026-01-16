'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Star, Briefcase, Calendar, Shield, CreditCard, Info, Crown, ArrowLeft, TestTube, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ReliabilityReviewCard } from '@/components/reliability-review-card';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ProBadge } from '@/components/pro-badge';
import { shouldShowProBadge } from '@/lib/subscription-utils';
import { BILLING_SIM_ALLOWED, getSimulatedPremium, clearSimulatedPremium } from '@/lib/billing-sim';
import { useSimulatedPremium } from '@/lib/use-simulated-premium';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const store = getStore();
  const [isSimulated, setSimulated] = useSimulatedPremium();

  if (!currentUser) {
    return null;
  }

  const reviews = store.getReviewsByRecipient(currentUser.id);
  const reliabilityReviews = reviews.filter((r) => r.isReliabilityReview);
  const standardReviews = reviews.filter((r) => !r.isReliabilityReview);

 const handleAvatarUpdate = (newAvatarUrl: string) => {
  store.updateUser(currentUser.id, {
    avatar: `${newAvatarUrl}?v=${Date.now()}`,
  });
};

  const dashboardPath = currentUser.role === 'admin' ? '/admin' : `/dashboard/${currentUser.role}`;
  const showBillingSimulation = BILLING_SIM_ALLOWED;
  const isUsingSimulation = showBillingSimulation && getSimulatedPremium();
  const hasRealPremium = shouldShowProBadge(currentUser);

  const getPlanStatus = () => {
    if (isUsingSimulation && !hasRealPremium) {
      return 'Premium (Simulated)';
    }
    if (hasRealPremium) {
      return 'Pro Plan';
    }
    return 'Free Plan';
  };

  const handleResetSimulation = () => {
    clearSimulatedPremium();
    setSimulated(false);
    window.location.reload();
  };

  return (
    <TradeGate>
      <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <Link href={dashboardPath}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <ProfileAvatar
              userId={currentUser.id}
              currentAvatarUrl={currentUser.avatar ?? undefined}
              userName={currentUser.name}
              onAvatarUpdate={handleAvatarUpdate}
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900">{currentUser.name}</h2>
                <StatusPill type="trust" status={currentUser.trustStatus} />
                {shouldShowProBadge(currentUser) && <ProBadge size="md" />}
              </div>
              <p className="text-gray-600 mb-2">{currentUser.email}</p>
              {currentUser.businessName && (
                <p className="text-gray-600">{currentUser.businessName}</p>
              )}
              {currentUser.primaryTrade && (
                <p className="text-sm font-medium text-blue-600 mt-1">
                  Primary Trade: {currentUser.primaryTrade}
                </p>
              )}
            </div>
            <Link href="/profile/edit">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{currentUser.rating}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
            </div>

            {currentUser.reliabilityRating && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{currentUser.reliabilityRating}</div>
                  <div className="text-sm text-gray-600">Reliability</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{currentUser.completedJobs}</div>
                <div className="text-sm text-gray-600">Completed Jobs</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {format(currentUser.memberSince, 'MMM yyyy')}
                </div>
                <div className="text-sm text-gray-600">Member Since</div>
              </div>
            </div>
          </div>
        </div>

        {currentUser.bio && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Bio</h3>
            <p className="text-gray-700">{currentUser.bio}</p>
          </div>
        )}

        {currentUser.trades && currentUser.trades.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Trade Skills</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.trades.map((trade) => (
                <span
                  key={trade}
                  className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm"
                >
                  {trade}
                </span>
              ))}
            </div>
          </div>
        )}

        {currentUser.role === 'subcontractor' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Subscription Plan</h3>
              </div>
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  View Plans
                </Button>
              </Link>
            </div>

            <div className={`flex items-center justify-between p-4 ${isUsingSimulation && !hasRealPremium ? 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300' : 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200'} rounded-lg`}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-lg font-bold text-gray-900">
                    {getPlanStatus()}
                  </span>
                  {hasRealPremium && <ProBadge size="sm" />}
                  {isUsingSimulation && !hasRealPremium && (
                    <span className="px-2 py-0.5 bg-amber-600 text-white text-xs font-semibold rounded">
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
                <div className={`text-2xl font-bold ${isUsingSimulation && !hasRealPremium ? 'text-amber-600' : 'text-blue-600'}`}>
                  ${hasRealPremium ? '10' : '0'}
                </div>
                <div className="text-xs text-gray-500">/month</div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/pricing">
                <Button className="w-full">
                  {shouldShowProBadge(currentUser) ? 'Manage Subscription' : 'Upgrade to Pro'}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {currentUser.role === 'contractor' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Payment Settings</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                Payment processing is coming soon. You'll be able to add payment methods and manage billing here.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-gray-500 text-sm">No payment method connected</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" disabled>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect Payment Method
                </Button>
                <Button variant="outline" disabled>
                  View Billing History
                </Button>
              </div>
            </div>
          </div>
        )}

        {showBillingSimulation && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <TestTube className="w-5 h-5 text-amber-700" />
              <h3 className="font-semibold text-gray-900">Billing Simulation (Testing Only)</h3>
            </div>

            <div className="bg-white border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                This is for testing Premium features locally. Does not charge money. Not real billing.
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    Simulate Premium
                  </div>
                  <p className="text-sm text-gray-600">
                    Test Premium UI gates and features without real subscription
                  </p>
                </div>
                <Switch
                  checked={isSimulated}
                  onCheckedChange={setSimulated}
                  aria-label="Toggle Premium simulation"
                />
              </div>

              {isSimulated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetSimulation}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Simulation
                </Button>
              )}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reviews ({reviews.length})</h3>
            <div className="space-y-4">
              {reliabilityReviews.map((review) => {
                const author = store.getUserById(review.authorId);
                if (!author) return null;
                return <ReliabilityReviewCard key={review.id} review={review} author={author} />;
              })}
              {standardReviews.map((review) => {
                const author = store.getUserById(review.authorId);
                if (!author) return null;
                return <ReliabilityReviewCard key={review.id} review={review} author={author} />;
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
    </TradeGate>
  );
}
