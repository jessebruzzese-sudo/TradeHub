'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  suggestions?: string[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  ctaVariant?: ButtonProps['variant'];
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  suggestions,
  ctaLabel,
  onCtaClick,
  ctaVariant = 'default',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-6 w-6 text-gray-600" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

      <p className="mt-2 max-w-md text-sm text-gray-600">
        {description}
      </p>

      {suggestions && suggestions.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-gray-600">
          {suggestions.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      )}

      {ctaLabel && onCtaClick && (
        <div className="mt-6">
          <Button variant={ctaVariant} onClick={onCtaClick}>
            {ctaLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
