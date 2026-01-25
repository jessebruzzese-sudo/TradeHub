'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { FeatureLock } from '@/lib/capability-utils';

interface UpgradeNudgeProps {
  featureLock: FeatureLock;
  title?: string;
  body?: string;
  variant?: 'inline' | 'banner';
}

export function UpgradeNudge({ featureLock, title, body, variant = 'inline' }: UpgradeNudgeProps) {
  if (!featureLock.locked) return null;

  const displayTitle = title || featureLock.reason || 'Upgrade to unlock this feature';
  const displayBody = body || featureLock.reason || '';

  if (variant === 'banner') {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold mb-1">{displayTitle}</p>
              {displayBody && <p className="text-sm">{displayBody}</p>}
            </div>
            <div className="flex-shrink-0">
              <Link href={featureLock.upgradeUrl || '/pricing'}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Upgrade to {featureLock.upgradePlanName}
                </Button>
              </Link>
              {featureLock.upgradePlanPrice && (
                <p className="text-xs text-blue-700 mt-1 text-center">
                  ${featureLock.upgradePlanPrice}/month • Cancel anytime
                </p>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{displayTitle}</h3>
          {displayBody && <p className="text-sm text-gray-600 mb-3">{displayBody}</p>}
          <Link href={featureLock.upgradeUrl || '/pricing'}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Upgrade to {featureLock.upgradePlanName}
            </Button>
          </Link>
          {featureLock.upgradePlanPrice && (
            <p className="text-xs text-gray-500 mt-2">
              ${featureLock.upgradePlanPrice}/month • Cancel anytime
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
