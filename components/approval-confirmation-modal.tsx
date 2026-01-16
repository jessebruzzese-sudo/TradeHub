'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface ApprovalConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tender' | 'job';
  redirectPath?: string;
}

export function ApprovalConfirmationModal({
  open,
  onOpenChange,
  type,
  redirectPath = '/dashboard',
}: ApprovalConfirmationModalProps) {
  const router = useRouter();

  const handleReturn = () => {
    onOpenChange(false);
    router.push(redirectPath);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {type === 'tender' ? 'Tender' : 'Job'} submitted for approval
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <p>
              Your {type} has been sent to our team for a quick review. This usually takes less
              than 1 hour. You'll be notified as soon as it's approved and live.
            </p>
            {type === 'tender' && (
              <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                Once approved, subcontractors can submit quotes and message you. You'll confirm the hire once you choose the right person for the job.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={handleReturn} className="w-full sm:w-auto">
            Return to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
