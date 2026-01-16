'use client';

import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Users, ShieldCheck, FileText, TrendingUp, MessageSquare, DollarSign, TestTube, AlertCircle, ChevronRight, Clock, LogOut } from 'lucide-react';
import Link from 'next/link';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { useState, useEffect, useMemo } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { currentUser, logout } = useAuth();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const store = getStore();
  const [pendingAccountReviews, setPendingAccountReviews] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [flaggedAccounts, setFlaggedAccounts] = useState(0);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadAdminData();
    }
  }, [currentUser]);

  const loadAdminData = async () => {
    try {
      const [reviewsResult, verificationsResult, flaggedResult, signupsResult] = await Promise.all([
        supabase
          .from('admin_account_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('trust_status', 'pending'),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .or('account_flagged_for_review.eq.true,account_suspended.eq.true'),
        supabase
          .from('users')
          .select('id, name, email, primary_trade, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (!reviewsResult.error && reviewsResult.count !== null) {
        setPendingAccountReviews(reviewsResult.count);
      }
      if (!verificationsResult.error && verificationsResult.count !== null) {
        setPendingVerifications(verificationsResult.count);
      }
      if (!flaggedResult.error && flaggedResult.count !== null) {
        setFlaggedAccounts(flaggedResult.count);
      }
      if (!signupsResult.error && signupsResult.data) {
        setRecentSignups(signupsResult.data);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo={currentUser ? `/dashboard/${currentUser.role}` : '/login'} />;
  }

  const pendingReviews = store.getPendingReviews();

  const urgentActions = useMemo(() => {
    const actions = [];
    if (pendingAccountReviews > 0) {
      actions.push({
        href: '/admin/account-reviews',
        icon: AlertCircle,
        label: 'Account Reviews',
        count: pendingAccountReviews,
        color: 'red'
      });
    }
    if (pendingVerifications > 0) {
      actions.push({
        href: '/admin/verifications',
        icon: ShieldCheck,
        label: 'ABN Verifications',
        count: pendingVerifications,
        color: 'yellow'
      });
    }
    if (flaggedAccounts > 0) {
      actions.push({
        href: '/admin/users',
        icon: Users,
        label: 'Flagged Accounts',
        count: flaggedAccounts,
        color: 'orange'
      });
    }
    return actions;
  }, [pendingAccountReviews, pendingVerifications, flaggedAccounts]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Log out</span>
            </button>
          </div>
          <p className="text-gray-600">Manage users, verifications, and platform settings</p>
        </div>

        <div className="md:hidden space-y-6 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Platform Metrics</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Users</span>
                <span className="text-lg font-bold text-gray-900">127</span>
              </div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Pending Verifications</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${pendingVerifications > 0 ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500'}`}>
                  {pendingVerifications}
                </span>
              </div>
              {pendingReviews.length > 0 && (
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Pending Reviews</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800">
                    {pendingReviews.length}
                  </span>
                </div>
              )}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Active Jobs</span>
                <span className="text-lg font-bold text-gray-900">45</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Jobs Posted</span>
                <span className="text-lg font-bold text-gray-900">312</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Admin Actions</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <Link href="/admin/account-reviews">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-900">Account Reviews</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingAccountReviews > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        {pendingAccountReviews}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>

              <Link href="/admin/verifications">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900">Verifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingVerifications > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                        {pendingVerifications}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>

              <Link href="/admin/reviews">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-900">Reviews</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingReviews.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                        {pendingReviews.length}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>

              <Link href="/admin/users">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Users</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>

              <Link href="/admin/jobs">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Jobs</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>

              <Link href="/admin/tenders">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Tenders</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>

              <Link href="/admin/audit-log">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Audit Log</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>

              <Link href="/admin/qa-setup">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <TestTube className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">QA Setup</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>

              <div className="p-4 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Billing</span>
                </div>
                <span className="text-xs text-gray-500">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">127</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">8</div>
                <div className="text-sm text-gray-600">Pending Verifications</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{pendingReviews.length}</div>
                <div className="text-sm text-gray-600">Pending Reviews</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">45</div>
                <div className="text-sm text-gray-600">Active Jobs</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">312</div>
                <div className="text-sm text-gray-600">Total Jobs Posted</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/users">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              </div>
              <p className="text-gray-600 mb-4">View and manage all users on the platform</p>
              <Button variant="outline">Manage Users</Button>
            </div>
          </Link>

          <Link href="/admin/account-reviews">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Account Reviews</h2>
                  {pendingAccountReviews > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {pendingAccountReviews} pending
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">Review new accounts for potential scams or misconduct</p>
              <Button variant="outline">Review Accounts</Button>
            </div>
          </Link>

          <Link href="/admin/jobs">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
              </div>
              <p className="text-gray-600 mb-4">View all jobs and cancellation history (read-only)</p>
              <Button variant="outline">View Jobs</Button>
            </div>
          </Link>

          <Link href="/admin/tenders">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Tenders</h2>
              </div>
              <p className="text-gray-600 mb-4">Review and approve tenders before they go live</p>
              <Button variant="outline">Moderate Tenders</Button>
            </div>
          </Link>

          <Link href="/admin/reviews">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                  {pendingReviews.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {pendingReviews.length} pending
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">Moderate reliability reviews and late cancellation feedback</p>
              <Button variant="outline">Moderate Reviews</Button>
            </div>
          </Link>

          <Link href="/admin/audit-log">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
              </div>
              <p className="text-gray-600 mb-4">View all admin actions and system events</p>
              <Button variant="outline">View Audit Log</Button>
            </div>
          </Link>

          <Link href="/admin/verifications">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Verifications</h2>
              </div>
              <p className="text-gray-600 mb-4">Review and approve user verification requests</p>
              <Button variant="outline">Manage Verifications</Button>
            </div>
          </Link>

          <Link href="/admin/qa-setup">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TestTube className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">QA Setup</h2>
              </div>
              <p className="text-gray-600 mb-4">Create test accounts for QA testing of trade-based visibility</p>
              <Button variant="outline">Setup Test Accounts</Button>
            </div>
          </Link>

          <div className="bg-white border border-gray-200 rounded-xl p-6 opacity-75">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
            </div>
            <p className="text-gray-600 mb-4">View platform revenue, transactions, and payment analytics</p>
            <Button variant="outline" disabled>View Billing (Coming Soon)</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
