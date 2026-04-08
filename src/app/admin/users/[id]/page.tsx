import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { AdminUserDetailClient } from './admin-user-detail-client';
import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import type { User } from '@/lib/types';
import { loadPublicProfileForPage } from '@/lib/profiles/load-public-profile-for-page';
import { parseProfileStrengthRpcResult } from '@/lib/profile-strength';
import { getDisplayTradeListFromUserRow } from '@/lib/trades/user-trades';

export const dynamic = 'force-dynamic';

type UsersRow = Database['public']['Tables']['users']['Row'];
type AdminAccountReviewRow = Database['public']['Tables']['admin_account_reviews']['Row'];

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

    const { data: authData } = await supabase.auth.getUser();
    const viewerId = authData.user?.id ?? null;

    const loaded = await loadPublicProfileForPage(supabase, userId, viewerId, { adminView: true });
    if (!loaded.ok) {
      return notFoundContent;
    }

    let profileData: Record<string, unknown> = { ...loaded.data };
    try {
      const { data: tradeRow } = await (supabase as any)
        .from('users')
        .select('primary_trade, additional_trades')
        .eq('id', userId)
        .maybeSingle();
      if (tradeRow) {
        const tradesList = getDisplayTradeListFromUserRow(tradeRow);
        profileData = {
          ...profileData,
          trades: tradesList,
          primary_trade: tradeRow.primary_trade ?? (profileData as { primary_trade?: string }).primary_trade,
        };
      }
    } catch {
      // non-blocking
    }

    try {
      const admin = createServiceSupabase();
      const { data: extra } = await admin
        .from('users')
        .select(
          'profile_strength_score, profile_strength_band, profile_likes_count, website_url, instagram_url, facebook_url, linkedin_url, google_business_url, google_business_name, google_business_address, google_place_id, google_rating, google_review_count, google_business_rating, google_business_review_count, google_listing_claimed_by_user, google_listing_verification_status, google_listing_verified_at, google_listing_verification_method, google_listing_verified_by, google_listing_rejection_reason, works_completed_count, jobs_posted_count, works_uploaded_count, last_active_at'
        )
        .eq('id', userId)
        .maybeSingle();
      if (extra) {
        profileData = { ...profileData, ...(extra as object) };
      }
    } catch {
      // columns may not exist before migration
    }

    let strengthCalc = null;
    try {
      const admin = createServiceSupabase() as any;
      const { data: profileStrengthBreakdown } = await admin.rpc('calculate_profile_strength', {
        p_user_id: userId,
      });
      strengthCalc = parseProfileStrengthRpcResult(profileStrengthBreakdown);
    } catch {
      // RPC unavailable
    }

    let viewerHasLiked = false;
    if (viewerId && viewerId !== userId) {
      const { data: existingLike } = await (supabase as any)
        .from('profile_likes')
        .select('id')
        .eq('liked_user_id', userId)
        .eq('liked_by_user_id', viewerId)
        .maybeSingle();
      viewerHasLiked = !!existingLike;
    }

    const likesCount = Number((profileData as { profile_likes_count?: number }).profile_likes_count ?? 0);
    const viewerLikeState =
      viewerId && viewerId !== userId ? { liked: viewerHasLiked, count: likesCount } : null;

    const service = createServiceSupabase();

    const [accountReviewResult, userResult] = await Promise.all([
      supabase
        .from('admin_account_reviews')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      service
        .from('users')
        .select(
          'id, name, email, role, trust_status, rating, completed_jobs, business_name, abn, abn_status, abn_verified_at, abn_submitted_at, abn_rejection_reason, created_at, member_since, avatar'
        )
        .eq('id', userId)
        .maybeSingle(),
    ]);

    const accountReview = accountReviewResult.data as AdminAccountReviewRow | null;
    const accountReviewError = accountReviewResult.error;
    const userRow = userResult.data as UsersRow | null;
    const userError = userResult.error;

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

    const review =
      accountReview && !accountReviewError
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

    const profileIsViewer = !!viewerId && viewerId === userId;

    return (
      <AdminUserDetailClient
        user={user}
        accountReview={review}
        userId={userId}
        profileData={profileData}
        strengthCalc={strengthCalc}
        viewerLikeState={viewerLikeState}
        profileIsViewer={profileIsViewer}
      />
    );
  } catch (e) {
    console.error('AdminUserDetailPage error', e);
    return notFoundContent;
  }
}
