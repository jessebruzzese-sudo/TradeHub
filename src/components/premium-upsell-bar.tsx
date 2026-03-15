'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type PremiumUpsellBarProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  href?: string;
  className?: string;
  /** When true, on mobile only: collapse into compact header row, expand on tap. Desktop unchanged. Default true. */
  mobileCollapsible?: boolean;
};

const ctaButtonClass =
  'group relative gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-2.5 font-semibold text-black shadow-lg shadow-amber-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/60 active:scale-[0.98]';

export function PremiumUpsellBar({
  title,
  description,
  ctaLabel = 'See Premium',
  href = '/pricing',
  className = '',
  mobileCollapsible = true,
}: PremiumUpsellBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullContent = (
    <>
      <p className="mt-1 text-sm text-amber-800">{description}</p>
      <div className="mt-3">
        <Link href={href}>
          <Button className={ctaButtonClass}>
            <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Crown className="h-4 w-4" />
            <span>{ctaLabel}</span>
          </Button>
        </Link>
      </div>
    </>
  );

  if (mobileCollapsible) {
    return (
      <div className={className}>
        {/* Mobile: collapsible compact dropdown */}
        <div className="md:hidden">
          <Collapsible open={mobileOpen} onOpenChange={setMobileOpen}>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-100/50 active:bg-amber-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Crown className="h-5 w-5 shrink-0 text-amber-700" />
                    <p className="text-sm font-semibold text-amber-900 truncate">{title}</p>
                  </div>
                  <span className="shrink-0 text-amber-700" aria-hidden>
                    {mobileOpen ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-amber-200/80 px-4 pb-4 pt-3">
                  {fullContent}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Desktop: always expanded, unchanged */}
        <div className="hidden md:block">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <Crown className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">{title}</p>
                {fullContent}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Crown className="mt-0.5 h-5 w-5 text-amber-700" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          {fullContent}
        </div>
      </div>
    </div>
  );
}
