'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import  StatusPill  from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Star, Briefcase, Calendar, Shield, ArrowLeft, MapPin, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ReliabilityReviewCard } from '@/components/reliability-review-card';
import { ProBadge } from '@/components/pro-badge';
import { shouldShowProBadge } from '@/lib/subscription-utils';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PublicProfilePage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const store = getStore();
  const userId = params.id as string;

  const user = store.getUserById(userId);

  if (!user) {
    return (
      <TradeGate>
        <AppLayout>
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
              <Link href="/jobs">
                <Button variant="outline">Back to Jobs</Button>
              </Link>
            </div>
          </div>
        </AppLayout>
      </TradeGate>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const reviews = store.getReviewsByRecipient(user.id).filter(r => r.moderationStatus === 'approved');
  const reliabilityReviews = reviews.filter((r) => r.isReliabilityReview);
  const standardReviews = reviews.filter((r) => !r.isReliabilityReview);

  return (
    <TradeGate>
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <Link
            href="/jobs"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>

          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-6 mb-6">
              <UserAvatar
                avatarUrl={user.avatar}
                userName={user.name}
                size="lg"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <StatusPill type="trust" status={user.trustStatus} />
                  {shouldShowProBadge(user) && <ProBadge size="md" />}
                  {user.abnStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      ABN verified
                    </span>
                  )}
                </div>
                {user.businessName && (
                  <p className="text-lg text-gray-700 mb-2">{user.businessName}</p>
                )}
                {user.primaryTrade && (
                  <p className="text-sm font-medium text-blue-600">
                    Primary Trade: {user.primaryTrade}
                  </p>
                )}
                {user.location && (
                  <div className="flex items-center gap-2 text-gray-600 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{user.location}</span>
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Link href="/profile/edit">
                  <Button variant="outline">Edit Profile</Button>
                </Link>
              )}
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{user.rating}</div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
              </div>

              {user.reliabilityRating && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{user.reliabilityRating}</div>
                    <div className="text-sm text-gray-600">Reliability</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{user.completedJobs}</div>
                  <div className="text-sm text-gray-600">Completed Jobs</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {format(user.memberSince, 'MMM yyyy')}
                  </div>
                  <div className="text-sm text-gray-600">Member Since</div>
                </div>
              </div>
            </div>
          </div>

          {user.bio && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700">{user.bio}</p>
            </div>
          )}

          {user.trades && user.trades.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Trade Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.trades.map((trade) => (
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

          {reviews.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-500">No reviews yet</p>
            </div>
          )}
        </div>
      </AppLayout>
    </TradeGate>
  );
}
