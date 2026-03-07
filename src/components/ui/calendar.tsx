'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-5',
        caption: 'relative flex items-center justify-center pt-1 pb-2',
        caption_label:
          'text-[1.125rem] font-semibold tracking-tight text-slate-900',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        nav_button:
          'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200',
        nav_button_previous: 'absolute left-0',
        nav_button_next: 'absolute right-0',

        table: 'w-full border-collapse',
        head_row: 'flex w-full justify-between mb-2',
        head_cell:
          'w-11 text-center text-[0.78rem] font-medium text-slate-400 tracking-[0.02em]',
        row: 'mt-2 flex w-full justify-between',
        cell: 'relative h-11 w-11 p-0 text-center text-sm',

        day: 'inline-flex h-11 w-11 items-center justify-center rounded-xl text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 aria-selected:opacity-100',
        day_selected:
          'bg-blue-600 text-white shadow-sm hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white',
        day_today:
          'border border-blue-200 bg-blue-50 text-blue-700',
        day_outside:
          'text-slate-300 hover:bg-transparent hover:text-slate-300 aria-selected:bg-slate-100 aria-selected:text-slate-400',
        day_disabled:
          'cursor-not-allowed text-slate-300 opacity-50',
        day_range_middle:
          'aria-selected:bg-blue-50 aria-selected:text-blue-700',
        day_range_end: 'day-range-end',
        day_hidden: 'invisible',

        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
