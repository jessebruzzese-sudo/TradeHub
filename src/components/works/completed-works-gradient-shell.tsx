import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Full-page blue gradient background used for Completed Works flows (/works, /works/[id]),
 * matching /works and /jobs/create (dotted overlay + watermark).
 */
export function CompletedWorksGradientShell({
  children,
  className,
}: {
  children: ReactNode;
  /** Width constraint for content, e.g. max-w-5xl (index) or max-w-4xl (detail). */
  className?: string;
}) {
  return (
    <div className="relative flex w-full min-h-screen flex-1 flex-col bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden
      />
      <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
        <img
          src="/TradeHub-Mark-whiteout.svg"
          alt=""
          aria-hidden="true"
          className="h-[1600px] w-[1600px] opacity-[0.08]"
        />
      </div>
      <div className={cn('relative z-10 mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', className)}>
        {children}
      </div>
    </div>
  );
}
