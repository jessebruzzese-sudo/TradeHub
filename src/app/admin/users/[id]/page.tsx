import { AdminUserDetailClient } from './admin-user-detail-client';
import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { loadPublicProfileForPage } from '@/lib/profiles/load-public-profile-for-page';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;
  const notFoundContent = (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <p className="text-gray-600">User not found</p>
      </div>
    </AppLayout>
  );

  try {
    return (
      <AdminUserDetailClient
        user={null}
        accountReview={null}
        userId={null}
        profileData={null}
        strengthCalc={null}
        viewerLikeState={null}
        profileIsViewer={null}
      />
    );
  } catch (e) {
    console.error('AdminUserDetailPage error', e);
    return notFoundContent;
  }
}
