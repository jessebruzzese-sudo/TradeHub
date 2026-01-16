'use client';

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { AuditLogView } from '@/components/audit-log-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuditLogPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const store = getStore();

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo={currentUser ? `/dashboard/${currentUser.role}` : '/login'} />;
  }

  const logs = store.getAuditLogs();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Complete Audit Log</h1>
          <p className="text-sm text-gray-600 mt-1">
            View-only log of all major admin actions
          </p>
        </div>

        <AuditLogView
          logs={logs}
          users={store.users}
          title="All Admin Actions"
          emptyMessage="No audit entries yet"
        />
      </div>
    </AppLayout>
  );
}
