'use client';

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import  StatusPill  from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { UnauthorizedAccess } from '@/components/unauthorized-access';

export default function VerificationsPage() {
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo={currentUser ? `/dashboard/${currentUser.role}` : '/login'} />;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Verification Queue</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-600">No pending verifications</p>
        </div>
      </div>
    </AppLayout>
  );
}
