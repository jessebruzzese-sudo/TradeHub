'use client';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UnauthorizedAccess } from '@/components/unauthorized-access';

export default function QATestsPage() {
  const { currentUser } = useAuth();

  if (!currentUser || !isAdmin(currentUser)) {
    return <UnauthorizedAccess redirectTo="/dashboard" />;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <PageHeader
          title="QA"
          description="End-to-end checks run via Playwright (see repository playwright/ and npm scripts)."
        />

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated tests</CardTitle>
              <CardDescription>
                Run <code className="text-xs bg-slate-100 px-1 rounded">npm run pw</code> or{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">npm run test:e2e</code> locally. CI uses{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">test:ci:full</code> where configured.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              The legacy in-browser QA harness was removed. Job and messaging
              flows are covered by Playwright specs under <code className="text-xs">playwright/</code>.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
