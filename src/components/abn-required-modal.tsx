'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sanitizeReturnUrl } from '@/lib/abn-utils';

interface ABNRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnUrl?: string;
}

export function ABNRequiredModal({ open, onOpenChange, returnUrl }: ABNRequiredModalProps) {
  const router = useRouter();

  const handleAddABN = () => {
    const sanitizedUrl = sanitizeReturnUrl(returnUrl);
    const url = `/verify-business?returnUrl=${encodeURIComponent(sanitizedUrl)}`;
    router.push(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center">Verify your business</DialogTitle>
          <DialogDescription className="text-center">
            Verify your ABN to unlock business features such as posting jobs and applying for tenders.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleAddABN} className="w-full">
            Add ABN
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
