'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { cn } from '@/lib/utils';

export type TradeMultiSelectProps = {
  value: string[];
  onChange: (next: string[]) => void;
  isPremium: boolean;
  maxPremium?: number;
  label?: string;
  /** Show validation error below the grid */
  error?: string;
};

const DEFAULT_MAX_PREMIUM = 5;

export function TradeMultiSelect({
  value,
  onChange,
  isPremium,
  maxPremium = DEFAULT_MAX_PREMIUM,
  label = 'Trade categories',
  error,
}: TradeMultiSelectProps) {
  const maxAllowed = isPremium ? maxPremium : 1;

  const handleToggle = useCallback(
    (trade: string, checked: boolean) => {
      if (checked) {
        if (value.length >= maxAllowed) {
          if (!isPremium && value.length >= 1) {
            return; // Don't change; gating UI will show
          }
          if (isPremium && value.length >= maxPremium) {
            return;
          }
        }
        onChange([...value, trade]);
      } else {
        onChange(value.filter((t) => t !== trade));
      }
    },
    [value, onChange, isPremium, maxAllowed, maxPremium]
  );

  const wouldExceedFree = !isPremium && value.length >= 1;
  const wouldExceedPremium = isPremium && value.length >= maxPremium;
  const atPremiumLimit = isPremium && value.length >= maxPremium;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Select your trade</h3>
      <p className="text-sm text-slate-500">
        Free plan: choose 1 trade. Premium: choose up to {maxPremium}.
      </p>

      <div
        className={cn(
          'grid gap-2',
          'grid-cols-2 sm:grid-cols-3'
        )}
        role="group"
        aria-label={label}
      >
        {TRADE_CATEGORIES.map((trade) => (
          <div
            key={trade}
            className="flex items-center gap-2"
          >
            <Checkbox
              id={`trade-${trade}`}
              checked={value.includes(trade)}
              onCheckedChange={(checked) => handleToggle(trade, checked === true)}
              disabled={atPremiumLimit && !value.includes(trade)}
              aria-disabled={
                (wouldExceedFree && !value.includes(trade)) ||
                (wouldExceedPremium && !value.includes(trade))
              }
            />
            <Label
              htmlFor={`trade-${trade}`}
              className="cursor-pointer font-normal text-sm"
            >
              {trade}
            </Label>
          </div>
        ))}
      </div>

      {!isPremium && wouldExceedFree && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="mb-2">Multiple trades are a Premium feature.</p>
          <Link href="/pricing">
            <Button type="button" variant="outline" size="sm">
              Unlock Multi-Trade
            </Button>
          </Link>
        </div>
      )}

      {isPremium && atPremiumLimit && value.length > 0 && (
        <p className="text-sm text-slate-600">
          You can select up to {maxPremium} trades.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
