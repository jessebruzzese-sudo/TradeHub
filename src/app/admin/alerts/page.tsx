'use client';

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

type AlertRow = {
  created_at: string;
  listing_type: string;
  listing_id: string;
  recipient_email: string;
  trade_label: string | null;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
};

export default function AdminAlertsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/alerts')
      .then(async (r) => {
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load');
        }
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setRows(data.rows ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo={currentUser ? '/dashboard' : '/login'} />;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Listing Alert Sends</h1>
          <p className="text-sm text-gray-600 mt-1">
            Debug view of recent job email alert sends (last 100)
          </p>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listing ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No alert sends recorded
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={`${r.listing_id}-${r.recipient_email}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {format(new Date(r.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.listing_type}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">
                        <a
                          href={`/jobs/${r.listing_id}`}
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.listing_id.slice(0, 8)}…
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.recipient_email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.trade_label ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            r.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : r.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500 truncate max-w-[120px]">
                        {r.provider_message_id ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 max-w-[200px] truncate" title={r.error_message ?? ''}>
                        {r.error_message ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
