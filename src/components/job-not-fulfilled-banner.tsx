'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, MessageSquare, FileText } from 'lucide-react';
import Link from 'next/link';

interface JobNotFulfilledBannerProps {
  jobId: string;
  jobTitle: string;
  jobDate: Date;
  markedAt: Date;
  hasSubmittedContext: boolean;
  onProvideContext: () => void;
}

export function JobNotFulfilledBanner({
  jobId,
  jobTitle,
  jobDate,
  markedAt,
  hasSubmittedContext,
  onProvideContext,
}: JobNotFulfilledBannerProps) {
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const deadline = new Date(markedAt);
      deadline.setHours(deadline.getHours() + 72);

      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      setHoursRemaining(diffHours);
      setIsExpired(diffHours === 0);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [markedAt]);

  const dateStr = jobDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (isExpired && !hasSubmittedContext) {
    return (
      <Alert className="bg-gray-50 border-gray-300">
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold mb-1">Context window closed</p>
              <p className="text-sm text-gray-700">
                The time window to provide context for this job has passed.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-red-50 border-red-200">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold mb-1">Job marked as not fulfilled</p>
            <p className="text-sm mb-3">
              The contractor for {jobTitle} on {dateStr} marked this job as not fulfilled.
              This doesn't mean your account is suspended. It's recorded as a reliability event and may be reviewed if repeated.
            </p>
            {!hasSubmittedContext && hoursRemaining > 0 && (
              <p className="text-sm font-medium text-red-800">
                You can provide optional context within {hoursRemaining} hour{hoursRemaining > 1 ? 's' : ''} if there were exceptional circumstances.
              </p>
            )}
            {hasSubmittedContext && (
              <p className="text-sm text-green-700 font-medium">
                Context submitted and visible to admins.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {!hasSubmittedContext && hoursRemaining > 0 && (
              <Button
                size="sm"
                onClick={onProvideContext}
                className="bg-red-600 hover:bg-red-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Provide context
              </Button>
            )}
            <Link href={`/messages?job=${jobId}`}>
              <Button size="sm" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message contractor
              </Button>
            </Link>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
