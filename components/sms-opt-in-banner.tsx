'use client';

import { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SmsOptInBannerProps {
  onEnableSms: () => void;
  onDismiss: () => void;
}

export function SmsOptInBanner({ onEnableSms, onDismiss }: SmsOptInBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <Alert className="bg-orange-50 border-orange-200 relative">
      <Smartphone className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-900">
        <div className="flex items-start justify-between gap-4 pr-6">
          <div>
            <p className="font-semibold mb-1">You just missed a matching job</p>
            <p className="text-sm">
              A contractor posted work near you, but it was filled before you saw it.
            </p>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Button
              size="sm"
              onClick={onEnableSms}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Get SMS alerts
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
            >
              Not now
            </Button>
          </div>
        </div>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-orange-700 hover:text-orange-900"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
