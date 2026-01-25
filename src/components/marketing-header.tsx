'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

type SectionId = 'tenders' | 'how-tradehub-works' | 'trust' | 'how-tendering-works';

export function MarketingHeader() {
  const { session } = useAuth();
  const isAuthed = !!session?.user;
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Smooth scroll on the home page so the sticky header doesn't cover the section title
  const scrollTo = (id: SectionId) => {
    if (!isHome) return;

    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = 80;
    const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  // Home page uses hash-only. Other pages go back to home + hash.
  const sectionHref = (id: SectionId) => (isHome ? `#${id}` : `/#${id}`);

  const NavAnchor = ({ id, label }: { id: SectionId; label: string }) => (
    <a
      href={sectionHref(id)}
      onClick={(e) => {
        // On home: prevent default jump + do smooth scroll with offset.
        if (isHome) {
          e.preventDefault();
          scrollTo(id);
        }
      }}
      className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      {label}
    </a>
  );

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

        {/* Scroll nav (smooth scroll on home; routes back to home+anchor from other pages) */}
        <nav className="hidden items-center gap-6 md:flex">
    
          <NavAnchor id="how-tradehub-works" label="How TradeHub works" />
          <NavAnchor id="trust" label="Trust & Safety" />
          <NavAnchor id="how-tendering-works" label="How Tendering Works" />
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isAuthed ? (
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
