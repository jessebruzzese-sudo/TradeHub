'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Info } from 'lucide-react';
import { getAvailabilityHorizonDays, isSubcontractorPro } from '@/lib/subscription-utils';
import { addDays, isBefore, startOfDay, isAfter } from 'date-fns';

type CalendarUser = {
  complimentaryPremiumUntil?: string | Date | null;
  subscriptionStatus?: string | null;
  activePlan?: string | null;
  subcontractorPlan?: string | null;
  subcontractorSubStatus?: string | null;
  radius?: number;
  subcontractorPreferredRadiusKm?: number;
};

interface AvailabilityCalendarProps {
  user: CalendarUser;
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  onUpgrade?: () => void;
}

export function AvailabilityCalendar({
  user,
  selectedDates,
  onDatesChange,
  onUpgrade
}: AvailabilityCalendarProps) {
  const isPro = isSubcontractorPro(user);
  const horizonDays = getAvailabilityHorizonDays(user);
  const today = startOfDay(new Date());
  const maxDate = addDays(today, horizonDays);

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (isAfter(date, maxDate)) {
      setShowUpgradePrompt(true);
      return;
    }

    setShowUpgradePrompt(false);

    const dateStr = date.toISOString().split('T')[0];
    const isSelected = selectedDates.some(
      d => d.toISOString().split('T')[0] === dateStr
    );

    if (isSelected) {
      onDatesChange(selectedDates.filter(d => d.toISOString().split('T')[0] !== dateStr));
    } else {
      onDatesChange([...selectedDates, date]);
    }
  };

  const disabledMatcher = (date: Date) => {
    return isBefore(date, today);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Your Dates</span>
          {!isPro && (
            <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Limited to {horizonDays} days
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Mark days when you have capacity available. This helps inform market insights and contractor planning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => {
              if (dates) {
                const validDates = (Array.isArray(dates) ? dates : [dates]).filter(
                  d => !isAfter(d, maxDate) && !isBefore(d, today)
                );
                onDatesChange(validDates);
              }
            }}
            disabled={disabledMatcher}
            className="rounded-md border"
            numberOfMonths={1}
          />
        </div>

        {!isPro && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Free plan: Set availability up to {horizonDays} days ahead.
              <Button
                variant="link"
                className="h-auto p-0 ml-1 text-blue-600 font-medium"
                onClick={onUpgrade}
              >
                Upgrade to Pro
              </Button>
              {' '}to extend to 60 days and enable availability broadcasts.
            </AlertDescription>
          </Alert>
        )}

        {showUpgradePrompt && !isPro && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Lock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-900">
              That date is beyond your {horizonDays}-day horizon. Upgrade to Pro to set availability further ahead.
            </AlertDescription>
          </Alert>
        )}

        {isPro && (
          <Alert className="bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-900">
              Pro: Set availability up to {horizonDays} days ahead. Your availability will be broadcast to contractors in your area.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2 text-sm text-gray-600">
          <strong>{selectedDates.length}</strong> {selectedDates.length === 1 ? 'day' : 'days'} selected
        </div>
      </CardContent>
    </Card>
  );
}
