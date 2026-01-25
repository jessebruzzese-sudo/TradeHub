'use client';

import { useState } from 'react';
import { Job } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { willBeLateCancellation, getHoursUntilStart } from '@/lib/cancellation-utils';

interface CancelJobDialogProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export function CancelJobDialog({ job, open, onOpenChange, onConfirm }: CancelJobDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLate = willBeLateCancellation(job);
  const hoursUntil = getHoursUntilStart(job);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      setReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Job</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this job?
          </DialogDescription>
        </DialogHeader>

        {isLate && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Cancelling Within 24 Hours</h4>
                <p className="text-sm text-blue-800 mb-2">
                  This job starts in approximately {Math.round(hoursUntil)} hours. Cancelling with less than 24 hours notice
                  significantly impacts the other party's schedule.
                </p>
                <p className="text-sm text-blue-800">
                  Both parties will have the option to share <strong>Reliability Feedback</strong> about
                  communication and planning for this situation. This helps maintain trust and transparency in the community.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Cancellation Reason {!isLate && '(Optional)'}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need to cancel this job..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleConfirm}
              variant="destructive"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              Keep Job
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
