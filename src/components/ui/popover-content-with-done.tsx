'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

type Props = React.ComponentProps<typeof PopoverContent> & {
  doneLabel?: string;
};

export function PopoverContentWithDone({
  children,
  className,
  doneLabel = 'Done',
  ...props
}: Props) {
  return (
    <PopoverContent
      {...props}
      className={`p-0 overflow-hidden ${className ?? ''}`}
    >
      <div className="p-3">{children}</div>

      <div className="border-t border-slate-200 bg-white/80 px-3 py-2 flex items-center justify-end">
        <PopoverPrimitive.Close asChild>
          <Button size="sm" className="rounded-lg">
            {doneLabel}
          </Button>
        </PopoverPrimitive.Close>
      </div>
    </PopoverContent>
  );
}
