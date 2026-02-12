'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Info, MapPin } from 'lucide-react';
import { getEffectiveRadiusKm, isSubcontractorPro, TIER_LIMITS } from '@/lib/subscription-utils';
import { Button } from '@/components/ui/button';
import { MVP_FREE_MODE, MVP_RADIUS_KM } from '@/lib/feature-flags';

type RadiusUser = {
  complimentaryPremiumUntil?: string | Date | null;
  subscriptionStatus?: string | null;
  activePlan?: string | null;
  subcontractorPlan?: string | null;
  subcontractorSubStatus?: string | null;
  radius?: number;
  subcontractorPreferredRadiusKm?: number;
};

interface RadiusSettingsProps {
  user: RadiusUser;
  onUpdate: (radiusKm: number) => void;
  onUpgrade?: () => void;
}

export function RadiusSettings({ user, onUpdate, onUpgrade }: RadiusSettingsProps) {
  const isPro = isSubcontractorPro(user);
  const effectiveRadius = getEffectiveRadiusKm(user);
  const preferredRadius = user.subcontractorPreferredRadiusKm || 15;

  // During MVP, cap applies to everyone
  const maxRadius = MVP_FREE_MODE
    ? MVP_RADIUS_KM
    : isPro ? TIER_LIMITS.PRO_10.maxRadiusKm : TIER_LIMITS.NONE.maxRadiusKm;

  const displayRadius = Math.min(preferredRadius, maxRadius);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Search Radius
        </CardTitle>
        <CardDescription>
          Set how far you&apos;re willing to travel for jobs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Radius (km)</Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{displayRadius}</span>
              <span className="text-sm text-gray-500">km</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Max {maxRadius}km
              </span>
            </div>
          </div>

          <Slider
            value={[displayRadius]}
            onValueChange={([value]) => onUpdate(value)}
            min={5}
            max={maxRadius}
            step={5}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-gray-500">
            <span>5km</span>
            <span>{maxRadius}km{MVP_FREE_MODE ? ' (MVP limit)' : !isPro ? ' (Free limit)' : ''}</span>
          </div>
        </div>

        {effectiveRadius !== preferredRadius && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Lock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-900">
              Your preferred radius is {preferredRadius}km, but {MVP_FREE_MODE ? 'the MVP' : 'the Free plan'} limits you to {maxRadius}km.
              Effective radius: <strong>{effectiveRadius}km</strong>
            </AlertDescription>
          </Alert>
        )}

        {MVP_FREE_MODE ? (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              During the MVP launch, search radius is capped at {MVP_RADIUS_KM}km for all users.
              Expanded radius will be part of Premium later.
            </AlertDescription>
          </Alert>
        ) : !isPro ? (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Free plan: Search radius capped at {maxRadius}km.
              <Button
                variant="link"
                className="h-auto p-0 ml-1 text-blue-600 font-medium"
                onClick={onUpgrade}
              >
                Upgrade to Pro
              </Button>
              {' '}to expand your reach up to 999km.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-900">
              Pro: Search radius up to 999km. You&apos;ll see jobs from a much wider area.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2 text-sm text-gray-600">
          Jobs within <strong>{effectiveRadius}km</strong> of your location will be shown to you.
        </div>
      </CardContent>
    </Card>
  );
}
