'use client';

import { useState, useEffect } from 'react';
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
import { AlertCircle, Clock } from 'lucide-react';

interface SubmitContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markedAt: Date;
  onSubmit: (context: string) => void;
}

export function SubmitContextDialog({
  open,
  onOpenChange,
  markedAt,
  onSubmit,
}: SubmitContextDialogProps) {
  const [context, setContext] = useState('');
  const [hoursRemaining, setHoursRemaining] = useState(0);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const deadline = new Date(markedAt);
      deadline.setHours(deadline.getHours() + 72);

      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      setHoursRemaining(diffHours);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [markedAt]);

  const handleSubmit = () => {
    if (!context.trim()) return;
    onSubmit(context);
    onOpenChange(false);
    setContext('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setContext('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Provide context for reliability event</DialogTitle>
          <DialogDescription>
            If there were circumstances that affected this job, you can provide a short explanation. This will only be visible to TradeHub admins if a review is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-blue-900">
              <Clock className="w-4 h-4" />
              <p className="text-sm font-medium">
                {hoursRemaining} hour{hoursRemaining !== 1 ? 's' : ''} remaining
              </p>
            </div>
            <p className="text-xs text-blue-800">
              This is optional and one-time only. Context submissions close 72 hours after the job was marked not fulfilled.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Your context (admin-only visibility)</Label>
            <Textarea
              id="context"
              placeholder="Example: Emergency family situation required me to leave early. I contacted the contractor immediately and offered to reschedule."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={5}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">{context.length}/500 characters</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-medium">Important:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Context does NOT remove the reliability event</li>
                  <li>Context is only visible to admins, not contractors</li>
                  <li>You can only submit context once per job</li>
                  <li>This does not guarantee any specific outcome</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!context.trim() || hoursRemaining === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
