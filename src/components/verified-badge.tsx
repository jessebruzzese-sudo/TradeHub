'use client';

import { Check } from "lucide-react";

export function VerifiedBadge() {
  return (
    <div className="inline-flex items-center gap-2">
      {/* Star Badge */}
      <div className="relative w-7 h-7">
        {/* Glow layer */}
        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30 blur-md scale-110" />

        {/* Star shape */}
        <div
          className="relative w-full h-full border-2 border-white shadow-md"
          style={{
            backgroundColor: '#1d9bf0',
            clipPath:
              'polygon(50% 0%, 61% 12%, 75% 8%, 82% 21%, 96% 25%, 92% 39%, 100% 50%, 92% 61%, 96% 75%, 82% 79%, 75% 92%, 61% 88%, 50% 100%, 39% 88%, 25% 92%, 18% 79%, 4% 75%, 8% 61%, 0% 50%, 8% 39%, 4% 25%, 18% 21%, 25% 8%, 39% 12%)',
          }}
        >
          <Check
            className="absolute inset-0 m-auto w-4 h-4 text-white"
            strokeWidth={3}
          />
        </div>
      </div>

      {/* Verified Pill */}
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500 text-white shadow-sm">
        Verified
      </span>
    </div>
  );
}
