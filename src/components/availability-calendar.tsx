'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Lock, Info } from 'lucide-react';
import { useNavigation, useDayPicker, Button } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { getAvailabilityHorizonDays, isSubcontractorPro } from '@/lib/subscription-utils';
import { addDays, subDays, isBefore, startOfDay, isAfter } from 'date-fns';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

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

  const premiumCalendarClassNames = {
    months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
    month: 'space-y-6',
    caption: 'relative',
    caption_label: 'flex items-center justify-center gap-2',
    nav: 'flex items-center justify-between w-full',
    nav_button:
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors',
    nav_button_previous: '',
    nav_button_next: '',
    table: 'w-full border-collapse',
    head_row: 'grid grid-cols-7 mb-4',
    head_cell:
      'text-[13px] font-medium text-slate-400 h-9 flex items-center justify-center',
    row: 'grid grid-cols-7 w-full mt-3',
    cell: 'h-11 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20',
    day: 'h-11 w-11 min-w-0 p-0 font-normal text-slate-700 hover:bg-blue-50 transition-colors aria-selected:opacity-100 flex items-center justify-center rounded-full',
    day_range_end: 'day-range-end',
    day_selected:
      'bg-blue-600 text-white hover:bg-blue-500 focus:bg-blue-600 focus:text-white',
    day_today:
      'border border-blue-300 text-blue-700 [&[aria-selected]]:border-transparent [&[aria-selected]]:text-white',
    day_outside: 'text-slate-300 opacity-50',
    day_disabled: 'text-slate-300 opacity-40 cursor-not-allowed hover:bg-transparent',
    day_range_middle: 'aria-selected:bg-blue-600 aria-selected:text-white',
    day_hidden: 'invisible',
  };

  const rangeModifiers = {
    range_single: (date: Date) => getRangeModifier(date) === 'range_single',
    range_start: (date: Date) => getRangeModifier(date) === 'range_start',
    range_middle: (date: Date) => getRangeModifier(date) === 'range_middle',
    range_end: (date: Date) => getRangeModifier(date) === 'range_end',
  };

  const rangeModifiersClassNames = {
    range_single: 'rounded-full',
    range_start: '!rounded-l-full !rounded-r-none',
    range_middle: '!rounded-none',
    range_end: '!rounded-r-full !rounded-l-none',
  };

  const CustomCaptionLabel = ({ displayMonth }: { displayMonth: Date }) => (
    <div className="flex items-center justify-center gap-2">
      <CalendarIcon className="h-5 w-5 text-blue-600" />
      <span className="text-[18px] font-semibold text-slate-800">
        {format(displayMonth, 'MMMM yyyy')}
      </span>
    </div>
  );

  const CustomCaption = ({ displayMonth, id }: { displayMonth: Date; id?: string }) => {
    const { previousMonth, nextMonth, goToMonth } = useNavigation();
    const { classNames, labels, locale, components } = useDayPicker();
    const IconLeft = components?.IconLeft ?? (() => <ChevronLeft className="h-4 w-4" />);
    const IconRight = components?.IconRight ?? (() => <ChevronRight className="h-4 w-4" />);
    const prevLabel = labels?.labelPrevious?.(previousMonth, { locale }) ?? 'Previous month';
    const nextLabel = labels?.labelNext?.(nextMonth, { locale }) ?? 'Next month';

    return (
      <div className="mb-6 grid grid-cols-[40px_1fr_40px] items-center" id={id}>
        <Button
          name="previous-month"
          aria-label={prevLabel}
          className={`${classNames.nav_button} ${classNames.nav_button_previous} justify-self-start`}
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
        >
          <IconLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center gap-2">
          <CustomCaptionLabel displayMonth={displayMonth} />
        </div>
        <Button
          name="next-month"
          aria-label={nextLabel}
          className={`${classNames.nav_button} ${classNames.nav_button_next} justify-self-end`}
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
        >
          <IconRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const innerContent = (
    <div className="space-y-4">
      {/* Calendar panel — Google-style widget */}
      <div className="flex justify-center px-2 py-4 md:py-5">
        <div className="w-full max-w-[400px] rounded-[28px] border border-slate-200/70 bg-white px-7 py-7 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
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
            className="p-0"
            classNames={premiumCalendarClassNames}
            modifiers={rangeModifiers}
            modifiersClassNames={rangeModifiersClassNames}
            numberOfMonths={1}
            components={{
              Caption: CustomCaption,
              CaptionLabel: CustomCaptionLabel,
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
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
