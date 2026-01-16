'use client';

import { useState } from 'react';
import { Job, Review } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface ReliabilityReviewFormProps {
  job: Job;
  recipientId: string;
  recipientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (review: Omit<Review, 'id' | 'createdAt'>) => void;
}

export function ReliabilityReviewForm({
  job,
  recipientId,
  recipientName,
  open,
  onOpenChange,
  onSubmit,
}: ReliabilityReviewFormProps) {
  const [reliabilityScore, setReliabilityScore] = useState(3);
  const [communicationScore, setCommunicationScore] = useState(3);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const avgRating = (reliabilityScore + communicationScore) / 2;
      await onSubmit({
        jobId: job.id,
        authorId: '',
        recipientId,
        rating: avgRating,
        text: text.trim(),
        isReliabilityReview: true,
        reliabilityScore,
        communicationScore,
        moderationStatus: 'pending',
      });
      setText('');
      setReliabilityScore(3);
      setCommunicationScore(3);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Reliability Feedback</DialogTitle>
          <DialogDescription>
            Share your experience with {recipientName}'s reliability and communication regarding the recent cancellation
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">About Reliability Reviews</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Focuses on reliability and communication context</li>
                <li>Weighted differently than work quality reviews</li>
                <li>Clearly labeled on profiles to provide context</li>
                <li>Reviewed by admins to ensure professionalism</li>
                <li>The other party can reply to share their perspective</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="mb-3 block">Reliability</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setReliabilityScore(score)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    reliabilityScore === score
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">1 = Very Unreliable, 5 = Very Reliable</p>
          </div>

          <div>
            <Label className="mb-3 block">Communication</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setCommunicationScore(score)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    communicationScore === score
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">1 = Very Poor, 5 = Excellent</p>
          </div>

          <div>
            <Label htmlFor="review-text">Your Review</Label>
            <Textarea
              id="review-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Explain the situation, their communication, and how the late cancellation affected you..."
              rows={5}
              className="mt-1"
              required
            />
            <p className="text-xs text-gray-600 mt-2">
              Focus on facts and professionalism. Avoid personal attacks.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
