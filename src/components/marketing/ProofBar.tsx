'use client';

const ITEMS = [
  'No credit card',
  '2 min setup',
  'Australia-wide',
  'No lead fees',
  'Never be over or under staffed',
];

export function ProofBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 text-sm text-gray-700">
      {ITEMS.map((label) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-300/60" aria-hidden />
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
