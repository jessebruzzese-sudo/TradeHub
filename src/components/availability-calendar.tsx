'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Lock, Info } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/style.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { getAvailabilityHorizonDays, isSubcontractorPro } from '@/lib/subscription-utils';
import { format, addDays, subDays, isBefore, startOfDay, isAfter } from 'date-fns';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

type CalendarUser = {
  plan?: string | null;
  complimentaryPremiumUntil?: string | Date | null;
  complimentary_premium_until?: string | Date | null;
  subscriptionStatus?: string | null;
  subscription_status?: string | null;
  radius?: number;
  subcontractorPreferredRadiusKm?: number;
};

interface AvailabilityCalendarProps {
  user: CalendarUser;
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  onUpgrade?: () => void;
  /** When true, render without Card wrapper for embedding inside a parent card */
  embedded?: boolean;
}

export function AvailabilityCalendar({
  user,
  selectedDates,
  onDatesChange,
  onUpgrade,
  embedded = false,
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
      return false;
    }
    setShowUpgradePrompt(false);
		return true;
  };

  const disabledMatcher = (date: Date) => {
    return isBefore(date, today);
  };

  const selectedSet = new Set(selectedDates.map((d) => d.toISOString().split('T')[0]));

  const getRangeModifier = (date: Date): string | null => {
    const key = date.toISOString().split('T')[0];
    if (!selectedSet.has(key)) return null;
    const prevDate = subDays(date, 1);
    const nextDate = addDays(date, 1);
    const prevKey = prevDate.toISOString().split('T')[0];
    const nextKey = nextDate.toISOString().split('T')[0];
    const prevSelected = selectedSet.has(prevKey);
    const nextSelected = selectedSet.has(nextKey);
    // Week starts Sunday (0); row ends Saturday (6)
    const prevInSameRow = date.getDay() !== 0; // prev day is in same row unless today is Sunday
    const nextInSameRow = date.getDay() !== 6; // next day is in same row unless today is Saturday
    const isStart = (!prevSelected || !prevInSameRow) && nextSelected && nextInSameRow;
    const isEnd = prevSelected && prevInSameRow && (!nextSelected || !nextInSameRow);
    const isMiddle = prevSelected && prevInSameRow && nextSelected && nextInSameRow;
    if (isMiddle) return 'range_middle';
    if (isStart) return 'range_start';
    if (isEnd) return 'range_end';
    return 'range_single';
  };

  const innerContent = (
    <div className="space-y-4">
      {/* Calendar panel — Google-style widget */}
      <div className="flex justify-center px-2 py-4 md:py-5">
        <div className="w-full max-w-[400px] rounded-[28px] border border-slate-200/70 bg-white px-7 py-7 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
					{/* confirm max selection days */}
          <DayPicker
						animate
            mode="multiple"
            selected={selectedDates}
						disabled={(date)=>{return date < startOfDay(new Date());}}
            onSelect={(dates)=>{
							const allowed = dates.filter(handleDateSelect);
							onDatesChange(allowed);
						}}
          />
        </div>
      </div>

      {/* Selected count — separated from widget */}
      <div className="pt-4 text-center text-sm text-slate-600">
        <strong className="font-semibold text-slate-700">{selectedDates.length}</strong>{' '}
        {selectedDates.length === 1 ? 'day' : 'days'} selected
      </div>

      {/* Upsell — amber premium style for free plan */}
      {MVP_FREE_MODE ? (
        <Alert className="border-slate-200/80 bg-slate-50/80">
          <Info className="h-4 w-4 text-slate-600" />
          <AlertDescription className="text-sm text-slate-700">
            Set availability up to {horizonDays} days ahead — unlimited entries within this window.
          </AlertDescription>
        </Alert>
      ) : !isPro ? (
        <>
          <PremiumUpsellBar
            title="Free plan: availability limited to 30 days"
            description="Upgrade to Pro to list availability up to 90 days ahead and unlock availability broadcasts."
            ctaLabel="Upgrade to Pro"
            href="/pricing"
          />

          {showUpgradePrompt && (
            <Alert className="border-amber-200/80 bg-amber-50/80">
              <Lock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-900">
                That date is beyond your {horizonDays}-day horizon. Upgrade to Pro to set availability further ahead.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <Alert className="border-slate-200/80 bg-slate-50/80">
          <Info className="h-4 w-4 text-slate-600" />
          <AlertDescription className="text-sm text-slate-700">
            Pro: Set availability up to {horizonDays} days ahead. Your availability will be broadcast to contractors in your area.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const headerContent = (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-lg font-semibold text-slate-900">Select Your Dates</span>
        <span className="text-xs font-medium text-slate-500">
          Up to {horizonDays} days
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Mark days when you have capacity available. This helps inform market insights and contractor planning.
        {MVP_FREE_MODE && ' No limit on the number of entries within the window.'}
      </p>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {headerContent}
        {innerContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Your Dates</span>
          <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
            Up to {horizonDays} days
          </span>
        </CardTitle>
        <CardDescription>
          Mark days when you have capacity available. This helps inform market insights and contractor planning.
          {MVP_FREE_MODE && ' No limit on the number of entries within the window.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {innerContent}
      </CardContent>
    </Card>
  );
}
