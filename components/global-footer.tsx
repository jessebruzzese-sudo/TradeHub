import Link from 'next/link';

export function GlobalFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
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
    </footer>
  );
}
