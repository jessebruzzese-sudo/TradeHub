import { createServerSupabase } from '@/lib/supabase-server';
import { AdminUserDetailClient } from './admin-user-detail-client';
import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/lib/types';

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
    const supabase = createServerSupabase();

    const { data: userData } = await supabase.auth.getUser();
    console.log('ADMIN USERS DETAIL auth user:', userData?.user?.id ?? null);
    console.log('ADMIN USERS DETAIL params.id:', userId);

    const [
      { data: accountReview, error: accountReviewError },
      { data: userRow, error: userError },
    ] = await Promise.all([
      supabase
        .from('admin_account_reviews')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('users')
        .select('id, name, email, role, trust_status, rating, completed_jobs, business_name, abn, abn_status, abn_verified_at, abn_submitted_at, abn_rejection_reason, created_at, member_since, avatar')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    if (userError || !userRow) {
      return notFoundContent;
    }

  const user: User = {
    id: userRow.id,
    name: userRow.name ?? '',
    email: userRow.email ?? '',
    role: (userRow.role ?? 'contractor') as User['role'],
    trustStatus: (userRow.trust_status ?? 'pending') as User['trustStatus'],
    avatar: userRow.avatar ?? null,
    rating: userRow.rating ?? 0,
    completedJobs: userRow.completed_jobs ?? 0,
    memberSince: userRow.member_since ? new Date(userRow.member_since) : new Date(userRow.created_at ?? Date.now()),
    createdAt: userRow.created_at ? new Date(userRow.created_at) : new Date(),
    businessName: userRow.business_name ?? undefined,
    abn: userRow.abn ?? undefined,
    abnStatus: (userRow.abn_status as User['abnStatus']) ?? undefined,
    abnVerifiedAt: userRow.abn_verified_at ?? undefined,
    abnSubmittedAt: userRow.abn_submitted_at ?? undefined,
    abnRejectionReason: userRow.abn_rejection_reason ?? undefined,
  };

  const review = accountReview && !accountReviewError
    ? {
        id: accountReview.id,
        user_id: accountReview.user_id,
        status: accountReview.status as 'pending' | 'reviewed' | 'flagged' | 'suspended',
        reviewed_by: accountReview.reviewed_by,
        reviewed_at: accountReview.reviewed_at,
        flag_reason: accountReview.flag_reason,
        notes: accountReview.notes,
        created_at: accountReview.created_at ?? new Date().toISOString(),
      }
    : null;

    return <AdminUserDetailClient user={user} accountReview={review} userId={userId} />;
  } catch (e) {
    console.error('AdminUserDetailPage error', e);
    return notFoundContent;
  }
}
