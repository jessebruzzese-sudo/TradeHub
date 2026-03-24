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
import { Zap } from 'lucide-react';

interface PremiumJobUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
}

export function PremiumJobUpsellModal({
  open,
  onOpenChange,
  jobId,
}: PremiumJobUpsellModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    try {
      router.push('/pricing');
    } catch (e) {
      console.error('[PremiumJobUpsellModal] handleUpgrade error', e);
    }
  };

  const handleViewJob = () => {
    onOpenChange(false);
    try {
      if (jobId && typeof jobId === 'string' && jobId.trim()) {
        router.push(`/jobs/${jobId}`);
      } else {
        router.push('/jobs');
      }
    } catch (e) {
      console.error('[PremiumJobUpsellModal] handleViewJob error', e);
      router.push('/jobs');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Upgrade to Premium to send alerts to available trades instantly
          </DialogTitle>
          <DialogDescription className="text-center">
            <span>
              Your job is listed normally. Upgrade to instantly notify available trades in your area.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full">
            Upgrade to Premium
          </Button>
          <Button onClick={handleViewJob} variant="outline" className="w-full">
            {jobId ? 'View My Job' : 'Return to Dashboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
