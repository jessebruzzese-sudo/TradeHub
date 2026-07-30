// vim: ts=2
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
	
	return (
		<AdminUserDetailClient
			accountReview={null}
			userId={userId}
			strengthCalc={null}
			viewerLikeState={null}
			profileIsViewer={null}
		/>
	);
}
