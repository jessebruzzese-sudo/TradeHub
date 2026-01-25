'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BILLING_SIM_ALLOWED } from '@/lib/billing-sim';
import { useSimulatedPremium } from '@/lib/use-simulated-premium';

export function BillingSimulationBanner() {
  const [isSimulated, setSimulated] = useSimulatedPremium();
  const isVisible = BILLING_SIM_ALLOWED && isSimulated;

  const handleTurnOff = () => {
    setSimulated(false);
    window.location.reload();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm md:text-base font-semibold">
              SIMULATION MODE: Premium enabled (not real billing)
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTurnOff}
          className="text-white hover:bg-amber-600 hover:text-white flex-shrink-0"
        >
          <X className="w-4 h-4 mr-2" />
          Turn Off
        </Button>
      </div>
    </div>
  );
}
