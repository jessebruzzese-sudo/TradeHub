'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MarketingHeader } from '@/components/marketing-header';

export function MarketingPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-white" aria-hidden />
      <div className="relative z-10">
        <MarketingHeader />
        <main>{children}</main>
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/TradeHub-Mark-blackout.svg" alt="TradeHub" width={32} height={32} className="h-8 w-8" />
              <span className="text-sm text-gray-600">© 2024 TradeHub. Australian construction marketplace.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
