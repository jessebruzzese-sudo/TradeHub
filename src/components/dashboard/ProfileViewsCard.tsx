'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

export function ProfileViewsCard() {
  const [viewsLast7Days, setViewsLast7Days] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile/views-count')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) return { viewsLast7Days: 0 };
          throw new Error('Failed to load');
        }
        return res.json();
      })
      .then((data: { viewsLast7Days?: number }) => {
        setViewsLast7Days(typeof data?.viewsLast7Days === 'number' ? data.viewsLast7Days : 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            <Eye className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (viewsLast7Days === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-gray-100">
            <Eye className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-5 flex-1 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Profile views</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{viewsLast7Days}</p>
          <p className="mt-0.5 text-xs text-gray-500">Last 7 days</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Eye className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
