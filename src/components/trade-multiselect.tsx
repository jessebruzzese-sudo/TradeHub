'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveTradesCatalog } from '@/lib/trades/use-active-trades-catalog';
import { cn } from '@/lib/utils';

export type TradeMultiSelectProps = {
  value: string[];
  onChange: (next: string[]) => void;
  isPremium: boolean;
  label?: string;
  /** Show validation error below the grid */
  error?: string;
};
export function TradeMultiSelect({
  value,
  onChange,
  isPremium,
  label = 'Trade categories',
  error,
}: TradeMultiSelectProps) {
  const { names: catalogTradeNames, loading: catalogLoading } = useActiveTradesCatalog();
  const [showBuilderPrompt, setShowBuilderPrompt] = useState(false);
  const hadBuilderSelectedRef = useRef(false);

  const handleToggle = useCallback(
    (trade: string, checked: boolean) => {
      if (checked) {
        if (!isPremium && value.length >= 1) {
          return; // Free users can only keep one trade selected.
        }
        onChange([...value, trade]);
      } else {
        onChange(value.filter((t) => t !== trade));
      }
    },
    [value, onChange, isPremium]
  );

  const wouldExceedFree = !isPremium && value.length >= 1;

  useEffect(() => {
    const hasBuilder = value.includes('Builder/Contractor');
    if (hasBuilder && !hadBuilderSelectedRef.current) {
      setShowBuilderPrompt(true);
    }
    hadBuilderSelectedRef.current = hasBuilder;
  }, [value]);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Select your trade</h3>
      <p className="text-sm text-slate-500">
        Free plan: choose 1 trade.{' '}
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">
          Premium: choose unlimited trades.
        </span>
      </p>

      <div
        className={cn(
          'grid gap-2',
          'grid-cols-2 sm:grid-cols-3'
        )}
        role="group"
        aria-label={label}
      >
        {catalogLoading ? (
          <div className="col-span-full py-6 text-center text-sm text-slate-500">Loading trades…</div>
        ) : (
          catalogTradeNames.map((trade) => (
            <div
              key={trade}
              className="flex items-center gap-2"
            >
              <Checkbox
                id={`trade-${trade}`}
                checked={value.includes(trade)}
                onCheckedChange={(checked) => handleToggle(trade, checked === true)}
                disabled={wouldExceedFree && !value.includes(trade)}
                aria-disabled={wouldExceedFree && !value.includes(trade)}
              />
              <Label
                htmlFor={`trade-${trade}`}
                className="cursor-pointer font-normal text-sm"
              >
                {trade}
              </Label>
            </div>
          ))
        )}
      </div>

      {!isPremium && wouldExceedFree && (
        <div className="rounded-xl border border-amber-300 bg-amber-100 p-4">
          <p>
            <span className="font-semibold text-amber-900">Multiple trades are a Premium feature.</span>{' '}
            <span className="text-amber-800">Free accounts can select one trade during signup.</span>
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Dialog open={showBuilderPrompt} onOpenChange={setShowBuilderPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Builder/Contractor selected</DialogTitle>
            <DialogDescription className="text-center">
              Builder/Contractor Role is recommended with premium user to post and receive jobs as any trade
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" onClick={() => setShowBuilderPrompt(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
