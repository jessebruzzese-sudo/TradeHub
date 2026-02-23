import Link from 'next/link';
import Image from 'next/image';

export function GlobalFooter() {
  return (
    <footer className="relative border-t border-gray-200 bg-gray-50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-xs text-gray-500 space-y-3">
          <p>
            TradeHub is a marketplace platform connecting contractors and subcontractors.
            TradeHub is not a party to any agreement, does not employ users, and does not guarantee work, payment, or outcomes.
            Availability indicators are informational only and do not represent a commitment or guarantee of work.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/terms"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <Link
        href="/"
        aria-label="Return to homepage"
        className="absolute bottom-6 right-6 md:bottom-8 md:right-8 group"
      >
        <div className="relative h-10 w-10 md:h-12 md:w-12 cursor-pointer transition-all duration-200 group-hover:scale-105 group-hover:opacity-90">
          <Image
            src="/tradehub-mark.svg"
            alt="TradeHub"
            fill
            className="object-contain"
          />
        </div>
      </Link>
    </footer>
  );
}
