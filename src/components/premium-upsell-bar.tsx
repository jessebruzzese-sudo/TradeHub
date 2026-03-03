import Link from 'next/link';
import { Crown } from 'lucide-react';

import { Button } from '@/components/ui/button';

type PremiumUpsellBarProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  href?: string;
  className?: string;
};

export function PremiumUpsellBar({
  title,
  description,
  ctaLabel = 'See Premium',
  href = '/pricing',
  className = '',
}: PremiumUpsellBarProps) {
  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Crown className="mt-0.5 h-5 w-5 text-amber-700" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          <p className="mt-1 text-sm text-amber-800">{description}</p>

          <div className="mt-3">
            <Link href={href}>
              <Button className="group relative gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-2.5 font-semibold text-black shadow-lg shadow-amber-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/60 active:scale-[0.98]">
                <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <Crown className="h-4 w-4" />
                <span>{ctaLabel}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
