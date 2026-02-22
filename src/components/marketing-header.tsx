'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { buildLoginUrl } from '@/lib/url-utils';

export function MarketingHeader() {
  const { session } = useAuth();
  const isAuthed = !!session?.user;

  const jobsHref = isAuthed ? '/jobs' : buildLoginUrl('/jobs');
  const tendersHref = isAuthed ? '/tenders' : buildLoginUrl('/tenders');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4 md:h-14">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/TradeHub -Horizontal-Main.svg"
            alt="TradeHub"
            width={140}
            height={32}
            className="h-7 w-auto md:h-8"
            priority
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <Link href={jobsHref} className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Jobs
          </Link>
          <Link href={tendersHref} className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Tenders
          </Link>
          <Link href="/how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            How it works
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
