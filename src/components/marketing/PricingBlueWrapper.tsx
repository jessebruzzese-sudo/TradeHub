'use client';

import React from 'react';

export function PricingBlueWrapper({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'relative min-h-screen',
        // Pricing page uses text-white on the wrapper content by default
        className,
      ].join(' ')}
    >
      {/* Dotted overlay - behind watermark */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden
      />

      {/* Watermark (fixed to viewport) - above background, behind content */}
      <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
        <img
          src="/TradeHub-Mark-whiteout.svg"
          alt=""
          aria-hidden="true"
          className="h-[1600px] w-[1600px] opacity-[0.08]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
