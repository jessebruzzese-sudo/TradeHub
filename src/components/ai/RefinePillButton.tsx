'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'amber';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export function RefinePillButton({
  onClick,
  disabled,
  loading = false,
  label = 'Refine with AI',
  loadingLabel = 'Refining…',
  title,
  variant = 'secondary',
  size = 'sm',
  className = '',
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const useGradientPill = variant === 'outline' || variant === 'secondary';
  const useAmberPill = variant === 'amber';

  const pillSizeClasses =
    size === 'sm'
      ? 'h-9 px-5 text-[13px]'
      : size === 'lg'
      ? 'h-11 px-7 text-base'
      : size === 'icon'
      ? 'h-10 w-10 p-0'
      : 'h-10 px-6 text-sm';

  const pillClasses = `
    group
    relative
    rounded-2xl
    font-semibold
    text-white
    transition-all
    overflow-hidden
    border-2 border-blue-600
    bg-gradient-to-r
    from-cyan-400
    via-blue-500
    to-pink-500
    shadow-[0_6px_20px_rgba(59,130,246,0.35)]
    hover:scale-[1.03]
    hover:border-blue-400
    hover:shadow-[0_10px_35px_rgba(59,130,246,0.55)]
    active:scale-[0.97]
    disabled:opacity-70
    disabled:cursor-not-allowed
  `;

  const amberPillClasses = `
    group
    relative
    rounded-full
    font-semibold
    text-black
    transition-all
    overflow-hidden
    text-sm
    bg-amber-400
    hover:bg-amber-300
    ring-2 ring-amber-300/50
    shadow-[0_0_0_6px_rgba(251,191,36,0.08)]
    hover:scale-[1.03]
    active:scale-[0.97]
    disabled:opacity-70
    disabled:cursor-not-allowed
  `;

  const baseClasses = `inline-flex items-center gap-2`;

  const effectiveVariant = useAmberPill ? 'ghost' : useGradientPill ? 'ghost' : variant;

  return (
    <Button
      type="button"
      variant={effectiveVariant}
      size={size}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${useGradientPill ? `${pillSizeClasses} ${pillClasses}` : ''}
        ${useAmberPill ? `${pillSizeClasses} ${amberPillClasses}` : ''}
        ${!useGradientPill && !useAmberPill ? baseClasses : ''}
        ${className}
      `}
      title={title}
    >
      {useGradientPill && (
        <span
          aria-hidden
          className="
            absolute inset-0
            rounded-2xl
            blur-xl
            opacity-40
            bg-gradient-to-r
            from-cyan-400
            via-blue-500
            to-pink-500
            transition-opacity
            group-hover:opacity-60
          "
        />
      )}

      <span className="relative z-10 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        {loading ? loadingLabel : label}
      </span>
    </Button>
  );
}
