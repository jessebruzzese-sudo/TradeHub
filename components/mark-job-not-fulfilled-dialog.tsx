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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { Job } from '@/lib/types';

interface MarkJobNotFulfilledDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  subcontractorName: string;
  onConfirm: (notes: string) => void;
}

export function MarkJobNotFulfilledDialog({
  open,
  onOpenChange,
  job,
  subcontractorName,
  onConfirm,
}: MarkJobNotFulfilledDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!confirmed) return;
    onConfirm(notes);
    onOpenChange(false);
    setConfirmed(false);
    setNotes('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setConfirmed(false);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark job as not fulfilled</DialogTitle>
          <DialogDescription>
            You're about to mark this job as not fulfilled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-sm text-amber-900 leading-relaxed">
              This should only be used if the subcontractor did not attend, cancelled late without agreement, or failed to complete the agreed work day.
            </p>
            <p className="text-sm text-amber-900 mt-2 leading-relaxed">
              This action may allow a reliability review and could contribute to an admin review if repeated.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (visible to admins only)</Label>
            <Textarea
              id="notes"
              placeholder="Example: No-show on site. No message received."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label
              htmlFor="confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I confirm this job was not fulfilled as agreed
            </Label>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <p className="text-xs text-gray-600">
              Misuse of this feature may be reviewed to ensure fairness.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed}
            className="bg-red-600 hover:bg-red-700"
          >
            Mark as not fulfilled
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
