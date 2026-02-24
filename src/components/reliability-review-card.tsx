import { Review, User } from '@/lib/types';
import { format } from 'date-fns';
import { Star, AlertTriangle } from 'lucide-react';
import { UserAvatar } from './user-avatar';

interface ReliabilityReviewCardProps {
  review: Review;
  author: User;
}

export function ReliabilityReviewCard({ review, author }: ReliabilityReviewCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {review.isReliabilityReview && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-medium text-blue-800">
            Reliability & Communication Review
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <UserAvatar avatarUrl={author.avatar} userName={author.name || 'TradeHub user'} size="md" />
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{author.name || 'TradeHub user'}</div>
          <div className="text-xs text-gray-600">{format(review.createdAt, 'MMM dd, yyyy')}</div>
        </div>
      </div>

      {review.isReliabilityReview ? (
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Reliability</div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="font-semibold text-gray-900">{review.reliabilityScore}/5</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Communication</div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="font-semibold text-gray-900">{review.communicationScore}/5</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-5 h-5 text-yellow-500 fill-current" />
          <span className="font-bold text-gray-900">{review.rating.toFixed(1)}</span>
          <span className="text-sm text-gray-600 ml-1">out of 5</span>
        </div>
      )}

      <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.text}</p>

      {review.reply && (
        <div className="mt-4 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded-r-lg">
          <div className="text-xs font-medium text-blue-900 mb-1">Response from recipient</div>
          <p className="text-sm text-blue-800 whitespace-pre-wrap">{review.reply.text}</p>
          <div className="text-xs text-blue-700 mt-2">
            {format(review.reply.createdAt, 'MMM dd, yyyy')}
          </div>
        </div>
      )}
    </div>
  );
}
