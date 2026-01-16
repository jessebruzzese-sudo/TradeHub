'use client';

import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TIER_LIMITS } from '@/lib/subscription-utils';
import { SubcontractorPlan } from '@/lib/types';

interface SubcontractorPlanComparisonProps {
  currentPlan?: SubcontractorPlan;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export function SubcontractorPlanComparison({
  currentPlan = 'NONE',
  onUpgrade,
  onManage
}: SubcontractorPlanComparisonProps) {
  const freePlan = TIER_LIMITS.NONE;
  const proPlan = TIER_LIMITS.PRO_10;
  const isPro = currentPlan === 'PRO_10';

  const features = [
    { name: 'Browse matching jobs', free: true, pro: true },
    { name: 'Apply to jobs', free: true, pro: true },
    { name: 'Messaging with contractors', free: true, pro: true },
    { name: 'Profile visibility', free: true, pro: true },
    { name: 'Search radius', free: '15km max', pro: 'Up to 999km' },
    { name: 'Work alerts (in-app)', free: true, pro: true },
    { name: 'Work alerts (email)', free: true, pro: true },
    { name: 'Work alerts (SMS)', free: true, pro: true },
    { name: 'Availability calendar', free: '14 days', pro: '60 days' },
    { name: 'Availability broadcast', free: false, pro: true },
    { name: 'Pro badge', free: false, pro: true },
    { name: 'Priority messaging', free: false, pro: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className={!isPro ? 'border-blue-200 shadow-sm' : ''}>
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-gray-900">$0</span>
              <span className="text-gray-600">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Get started with basic access to jobs in your area.
            </p>
            <ul className="space-y-2">
              {freePlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {!isPro && (
              <div className="pt-4">
                <Button variant="outline" disabled className="w-full">
                  Current Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={isPro ? 'border-blue-500 shadow-md' : 'border-blue-200'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Pro</CardTitle>
              {isPro && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  Current
                </span>
              )}
            </div>
            <CardDescription>
              <span className="text-3xl font-bold text-gray-900">$10</span>
              <span className="text-gray-600">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Expand your reach with enhanced alerts and tools.
            </p>
            <ul className="space-y-2">
              {proPlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="pt-4">
              {isPro ? (
                <Button variant="outline" onClick={onManage} className="w-full">
                  Manage Subscription
                </Button>
              ) : (
                <Button onClick={onUpgrade} className="w-full">
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-medium">Feature</th>
                  <th className="text-center py-3 font-medium w-32">Free</th>
                  <th className="text-center py-3 font-medium w-32">Pro</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-3">{feature.name}</td>
                    <td className="text-center py-3">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-gray-700">{feature.free}</span>
                      )}
                    </td>
                    <td className="text-center py-3">
                      {typeof feature.pro === 'boolean' ? (
                        feature.pro ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-gray-700 font-medium">{feature.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>No lead-selling:</strong> You're paying for reach and alerts, not per-lead access.
          All job details remain visible regardless of your plan.
        </p>
      </div>
    </div>
  );
}
