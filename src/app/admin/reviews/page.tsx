'use client';

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { useRouter } from 'next/navigation';

export default function ReviewModerationPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const store = getStore();

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo={currentUser ? `/dashboard/${currentUser.role}` : '/login'} />;
  }

  const pendingReviews = store.getPendingReviews();

  const handleApprove = (reviewId: string) => {
    store.updateReview(reviewId, { moderationStatus: 'approved' });
    router.refresh();
  };

  const handleReject = (reviewId: string) => {
    store.updateReview(reviewId, { moderationStatus: 'rejected' });
    router.refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Review Moderation</h1>

        {pendingReviews.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No reviews pending moderation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((review) => {
              const author = store.getUserById(review.authorId);
              const recipient = store.getUserById(review.recipientId);
              const job = store.getJobById(review.jobId);

              if (!author || !recipient || !job) return null;

              return (
                <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  {review.isReliabilityReview && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-yellow-800">
                        Reliability Review (Late Cancellation)
                      </span>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">From</p>
                      <div className="flex items-center gap-2">
                        <UserAvatar avatarUrl={author.avatar} userName={author.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{author.name}</p>
                          <p className="text-xs text-gray-600">{author.role}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">For</p>
                      <div className="flex items-center gap-2">
                        <UserAvatar avatarUrl={recipient.avatar} userName={recipient.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{recipient.name}</p>
                          <p className="text-xs text-gray-600">{recipient.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Job: {job.title}</p>
                    <p className="text-xs text-gray-600">
                      Cancelled on: {job.cancelledAt ? format(job.cancelledAt, 'MMM dd, yyyy h:mm a') : 'N/A'}
                    </p>
                  </div>

                  {review.isReliabilityReview ? (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Reliability Score</p>
                        <p className="text-lg font-bold text-gray-900">{review.reliabilityScore}/5</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Communication Score</p>
                        <p className="text-lg font-bold text-gray-900">{review.communicationScore}/5</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-1">Rating</p>
                      <p className="text-lg font-bold text-gray-900">{review.rating}/5</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Review Text</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.text}</p>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Submitted: {format(review.createdAt, 'MMM dd, yyyy h:mm a')}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => handleApprove(review.id)} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button onClick={() => handleReject(review.id)} variant="outline" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
