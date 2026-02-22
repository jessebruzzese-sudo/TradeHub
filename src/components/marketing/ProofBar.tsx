'use client';

const ITEMS = ['No credit card', '2 min setup', 'Australia-wide'];

export function ProofBar() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
        {ITEMS.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-green-500"
              aria-hidden
            />
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {i < ITEMS.length - 1 && (
              <span className="hidden text-gray-300 sm:inline" aria-hidden>
                •
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
