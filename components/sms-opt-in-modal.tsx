'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Check } from 'lucide-react';

interface SmsOptInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SmsOptInModal({ open, onOpenChange, onConfirm }: SmsOptInModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Get notified faster with SMS alerts</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2">
            Don't miss out on matching jobs again. SMS alerts notify you instantly when contractors post work in your area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Instant notifications</p>
              <p className="text-sm text-gray-600">Get alerted the moment a job is posted</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">No spam</p>
              <p className="text-sm text-gray-600">Only matching jobs based on your trade and location</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Turn off anytime</p>
              <p className="text-sm text-gray-600">Easily disable SMS alerts in your settings</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Keep Email & In-app only
          </Button>
          <Button
            onClick={handleConfirm}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Enable SMS alerts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
