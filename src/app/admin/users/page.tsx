'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { safeRouterReplace } from '@/lib/safe-nav';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  primaryTrade?: string;
  trustStatus: string;
  createdAt: string;
  lastSeenAt?: string;
  avatar_url?: string | null;
}

type SortBy =
  | 'newest'
  | 'oldest'
  | 'online'
  | 'today'
  | 'week'
  | 'month'
  | 'inactive'
  | 'never';

export default function AdminUsersPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { currentUser, isLoading } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [trades, setTrades] = useState<string[]>([]);

  const hasRedirected = useRef(false);

  // ✅ Gate admin page (prevents non-admins hitting it)
  useEffect(() => {
    if (isLoading) return;
    if (hasRedirected.current) return;

    if (!currentUser) {
      hasRedirected.current = true;
      safeRouterReplace(router, '/login?returnUrl=/admin/users', '/login?returnUrl=/admin/users');
      return;
    }

    if (!isAdmin(currentUser)) {
      hasRedirected.current = true;
      safeRouterReplace(router, '/dashboard', '/dashboard');
    }
  }, [isLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) return;
    loadUsers();
    loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, tradeFilter, currentUser?.id]);

  const loadTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('primary_trade')
        .not('primary_trade', 'is', null);

      if (error) throw error;

      const uniqueTrades = Array.from(new Set((data || []).map((u: any) => u.primary_trade).filter(Boolean)));
      setTrades(uniqueTrades as string[]);
    } catch (err) {
      console.error('Error loading trades:', err);
      // don’t block users list if trades fails
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      let query = supabase
        .from('users')
        .select('id, name, email, role, primary_trade, trust_status, created_at, last_seen_at, avatar_url');

      if (tradeFilter !== 'all') {
        query = query.eq('primary_trade', tradeFilter);
      }

      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'online':
          query = query.gte('last_seen_at', twoMinutesAgo.toISOString()).order('last_seen_at', { ascending: false });
          break;
        case 'today':
          query = query.gte('last_seen_at', startOfToday.toISOString()).order('last_seen_at', { ascending: false });
          break;
        case 'week':
          query = query.gte('last_seen_at', sevenDaysAgo.toISOString()).order('last_seen_at', { ascending: false });
          break;
        case 'month':
          query = query.gte('last_seen_at', thirtyDaysAgo.toISOString()).order('last_seen_at', { ascending: false });
          break;
        case 'inactive':
          query = query.lt('last_seen_at', thirtyDaysAgo.toISOString()).order('last_seen_at', { ascending: false });
          break;
        case 'never':
          query = query.is('last_seen_at', null).order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading users:', error);
        setUsers([]);
        // ✅ show helpful RLS hint
        setErrorMsg(
          `${error.message}\n\nIf you only see yourself (or nothing), this is usually RLS. Add an admin SELECT policy on public.users so admins can read all rows.`
        );
        return;
      }

      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          name: u.name ?? '',
          email: u.email ?? '',
          role: u.role ?? '',
          primaryTrade: u.primary_trade ?? undefined,
          trustStatus: u.trust_status ?? 'pending',
          createdAt: u.created_at,
          lastSeenAt: u.last_seen_at ?? undefined,
          avatar_url: u.avatar_url ?? null,
        }))
      );
    } catch (err: any) {
      console.error('Error loading users:', err);
      setUsers([]);
      setErrorMsg(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      return (user.name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q);
    });
  }, [users, searchTerm]);

  const getOnlineStatus = (lastSeenAt?: string) => {
    if (!lastSeenAt) return 'Never';
    const lastSeen = new Date(lastSeenAt);
    const diffMinutes = (Date.now() - lastSeen.getTime()) / (1000 * 60);
    if (diffMinutes <= 2) return 'Online now';
    return formatDistanceToNow(lastSeen, { addSuffix: true });
  };

  const getInitials = (name: string) =>
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  // While redirecting / loading auth
  if (isLoading || !currentUser) return null;
  if (!isAdmin(currentUser)) return null;

  return (
    <div className="p-8">
      <PageHeader title="Users" description="Manage user accounts and permissions" />

      {errorMsg && (
        <Card className="p-4 mb-6 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700 whitespace-pre-wrap">{errorMsg}</div>
          </div>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="online">Online now</SelectItem>
                <SelectItem value="today">Active today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="inactive">Inactive 30+ days</SelectItem>
                <SelectItem value="never">Never logged in</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                {trades.map((trade) => (
                  <SelectItem key={trade} value={trade}>
                    {trade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Online</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium text-gray-900">{user.name || '—'}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email || '—'}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="capitalize">
                        {user.role || '—'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.primaryTrade || '-'}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={user.trustStatus === 'verified' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {user.trustStatus}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getOnlineStatus(user.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users found</div>
          )}
        </Card>
      )}
    </div>
  );
}
