'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function MarketingHeader() {
  const { session, isLoading } = useAuth();
  const isAuthed = !!session?.user;
  const pathname = usePathname();
  const isHome = pathname === '/';

  const scrollTo = (id: string) => {
    if (!isHome) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionHref = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/TradeHub -Horizontal-Main with tagline.svg"
            alt="TradeHub"
            width={180}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/tenders" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Tenders
          </Link>

          {/* Scroll on home, anchor on other pages */}
          <a
            href={sectionHref('tendering-detail')}
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                scrollTo('tendering-detail');
              }
            }}
            className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            How Tendering Works
          </a>

          <a
            href={sectionHref('trust')}
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                scrollTo('trust');
              }
            }}
            className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Trust & Safety
          </a>

          <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? null : isAuthed ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-gray-700 hover:text-gray-900 sm:inline-flex">
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
