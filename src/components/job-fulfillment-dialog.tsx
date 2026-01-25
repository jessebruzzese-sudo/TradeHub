'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Job } from '@/lib/types';

interface JobFulfillmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  subcontractorName: string;
  onConfirm: (fulfilled: boolean, eventType?: string, notes?: string) => void;
}

export function JobFulfillmentDialog({
  open,
  onOpenChange,
  job,
  subcontractorName,
  onConfirm,
}: JobFulfillmentDialogProps) {
  const [fulfillmentStatus, setFulfillmentStatus] = useState<'fulfilled' | 'not_fulfilled'>('fulfilled');
  const [eventType, setEventType] = useState<string>('NO_SHOW');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (fulfillmentStatus === 'fulfilled') {
      onConfirm(true);
    } else {
      onConfirm(false, eventType, notes);
    }
    onOpenChange(false);
    setFulfillmentStatus('fulfilled');
    setEventType('NO_SHOW');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark Job Fulfillment</DialogTitle>
          <DialogDescription>
            Did {subcontractorName} complete the work for {job.title}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Fulfillment Status</Label>
            <RadioGroup
              value={fulfillmentStatus}
              onValueChange={(value) => setFulfillmentStatus(value as 'fulfilled' | 'not_fulfilled')}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="fulfilled" id="fulfilled" />
                <Label htmlFor="fulfilled" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Job Fulfilled</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    The subcontractor showed up and completed the work
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="not_fulfilled" id="not_fulfilled" />
                <Label htmlFor="not_fulfilled" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium">Not Fulfilled</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    The subcontractor did not show up or did not complete the work
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {fulfillmentStatus === 'not_fulfilled' && (
            <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="event-type" className="text-red-900">
                  What happened?
                </Label>
                <RadioGroup value={eventType} onValueChange={setEventType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NO_SHOW" id="no-show" />
                    <Label htmlFor="no-show" className="cursor-pointer text-sm">
                      No-show (didn't arrive)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DID_NOT_COMPLETE" id="did-not-complete" />
                    <Label htmlFor="did-not-complete" className="cursor-pointer text-sm">
                      Did not complete the work
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="LATE_CANCELLATION" id="late-cancel" />
                    <Label htmlFor="late-cancel" className="cursor-pointer text-sm">
                      Late cancellation
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-red-900">
                  Additional notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Provide details about what happened..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-white"
                />
              </div>

              <p className="text-xs text-red-800">
                This will be recorded as a reliability event. The subcontractor will be notified. After 3 events in 90 days, their account will be flagged for admin review.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={fulfillmentStatus === 'fulfilled' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
