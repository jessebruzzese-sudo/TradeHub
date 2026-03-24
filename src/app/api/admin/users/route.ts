import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { applyExcludeTestAccountsFilters } from '@/lib/test-account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SortBy =
  | 'newest'
  | 'oldest'
  | 'online'
  | 'today'
  | 'week'
  | 'month'
  | 'inactive'
  | 'never';

type AccountType = 'all' | 'qa' | 'real';

function normalizeSortBy(input: string | null): SortBy {
  const value = String(input || 'newest');
  const allowed: SortBy[] = ['newest', 'oldest', 'online', 'today', 'week', 'month', 'inactive', 'never'];
  return allowed.includes(value as SortBy) ? (value as SortBy) : 'newest';
}

function normalizeAccountType(input: string | null): AccountType {
  const value = String(input || 'all').toLowerCase();
  const allowed: AccountType[] = ['all', 'qa', 'real'];
  return allowed.includes(value as AccountType) ? (value as AccountType) : 'all';
}

function classifyAccountType(emailInput: unknown, nameInput: unknown): 'qa' | 'real' {
  const email = String(emailInput || '').trim().toLowerCase();
  const name = String(nameInput || '').trim().toLowerCase();

  const isQaEmail =
    email.endsWith('@tradehub.test') ||
    email.startsWith('emailtest_') ||
    /^test\d+@gmail\.com$/.test(email) ||
    email.includes('+') ||
    email.includes('test');

  const isQaName = name.startsWith('qa ') || name.includes('qa test') || name.includes('manual premium qa');

  return isQaEmail || isQaName ? 'qa' : 'real';
}

export async function GET(request: NextRequest) {
  try {
    const authSupabase = createServerSupabase();
    const serviceSupabase = createServiceSupabase();

    const {
      data: { user },
      error: userErr,
    } = await authSupabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: adminErr } = await serviceSupabase
      .from('users')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    const role = String((profile as any)?.role || '').trim().toLowerCase();
    const isAdmin = !!profile && (profile.is_admin === true || role === 'admin');
    if (adminErr || !isAdmin) {
      if (adminErr) console.error('Admin users auth failed:', adminErr);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sortBy = normalizeSortBy(searchParams.get('sortBy'));
    const trade = String(searchParams.get('trade') || 'all');
    const accountType = normalizeAccountType(searchParams.get('accountType'));

    let query = serviceSupabase
      .from('users')
      .select('id, name, email, role, primary_trade, trust_status, created_at, last_seen_at, avatar')
      .limit(5000);
    query = applyExcludeTestAccountsFilters(query);

    if (trade && trade !== 'all') {
      query = query.eq('primary_trade', trade);
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
      console.error('Admin users list failed:', error);
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }

    const users = (data ?? []).map((u: any) => ({
      ...u,
      account_type: classifyAccountType(u?.email, u?.name),
    }));
    const usersFilteredByType =
      accountType === 'all' ? users : users.filter((u: any) => u.account_type === accountType);
    const allTrades = Array.from(
      new Set(
        users
          .map((u) => (u as any).primary_trade)
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ users: usersFilteredByType, trades: allTrades });
  } catch (err: any) {
    console.error('Admin users route error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
