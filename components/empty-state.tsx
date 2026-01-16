import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCtaClick?: () => void;
  suggestions?: string[];
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
  secondaryCtaLabel,
  onSecondaryCtaClick,
  suggestions,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="mb-4">
          <Icon className="w-12 h-12 text-gray-400" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      <p className="text-gray-600 max-w-md mb-6">
        {description}
      </p>

      {suggestions && suggestions.length > 0 && (
        <div className="mb-6 max-w-md">
          <p className="text-sm font-medium text-gray-700 mb-3">Suggestions:</p>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(ctaLabel || secondaryCtaLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {ctaLabel && onCtaClick && (
            <Button onClick={onCtaClick}>
              {ctaLabel}
            </Button>
          )}
          {secondaryCtaLabel && onSecondaryCtaClick && (
            <Button variant="outline" onClick={onSecondaryCtaClick}>
              {secondaryCtaLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
