import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ProBadge({ size = 'md', showIcon = true }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <Badge
      variant="secondary"
      className={`bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold ${sizeClasses[size]} inline-flex items-center gap-1`}
    >
      {showIcon && <Crown className={iconSizes[size]} />}
      PRO
    </Badge>
  );
}
