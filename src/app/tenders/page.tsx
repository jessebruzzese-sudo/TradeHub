'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ProfileAvatar } from '@/components/profile-avatar';
import { PremiumUpsellBar } from '@/components/premium-upsell-bar';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { getTradeIcon } from '@/lib/trade-icons';
import { isPremiumForDiscovery } from '@/lib/discovery';

import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  Tag,
  Star,
  XCircle,
  BadgeCheck,
  FileText,
  Plus,
  RotateCcw,
} from 'lucide-react';

type TenderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'LIVE' | 'CLOSED' | string;

type TenderRow = {
  id: string;
  builder_id: string;
  status: TenderStatus;
  tier: string | null;
  is_anonymous: boolean | null;
  is_name_hidden: boolean | null;
  project_name: string;
  project_description: string | null;
  suburb: string | null;
  postcode: string | null;
  created_at?: string | null;
  desired_start_date?: string | null;
  desired_end_date?: string | null;
  poster?: any;
  distance_km?: number | null;
  quotes_received?: number;
  quote_request_status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
};

type BuilderMap = Record<
  string,
  {
    id: string;
    name: string | null;
    business_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    rating_count: number | null;
    abn_status: string | null;
    abn_verified_at: string | null;
    is_premium: boolean | null;
  }
>;

function getPosterName(p: any): string {
  return (
    p?.business_name ??
    p?.businessName ??
    p?.full_name ??
    p?.fullName ??
    p?.name ??
    'Poster'
  );
}

function getPosterAvatar(p: any): string | undefined {
  return p?.avatar_url ?? p?.avatarUrl ?? p?.avatar ?? undefined;
}

function getPosterRating(p: any): { rating: number | null; count: number | null } {
  const r = p?.rating;
  const c = p?.rating_count ?? p?.review_count ?? p?.reviews_count ?? null;
  const rating = typeof r === 'number' ? r : r != null ? Number(r) : null;
  const count = typeof c === 'number' ? c : c != null ? Number(c) : null;
  return {
    rating: Number.isFinite(rating as number) ? (rating as number) : null,
    count: Number.isFinite(count as number) ? (count as number) : null,
  };
}

function statusVariant(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'LIVE') return 'default';
  if (s === 'PENDING_APPROVAL') return 'secondary';
  if (s === 'DRAFT') return 'secondary';
  if (s === 'CLOSED' || s === 'CANCELLED') return 'outline';
  return 'outline';
}

function prettyStatus(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'LIVE') return 'Live';
  if (s === 'PENDING_APPROVAL') return 'Pending approval';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'CLOSED') return 'Closed';
  if (s === 'CANCELLED') return 'Cancelled';
  return s || 'Unknown';
}

function prettyTier(tier?: string | null) {
  const t = String(tier || '').toUpperCase();
  if (!t) return null;
  if (t === 'FREE_TRIAL') return 'Free Trial';
  return t.replaceAll('_', ' ');
}

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 });
}

function priceBandLabelFromCents(maxCents?: number | null) {
  if (!maxCents || maxCents <= 0) return null;
  const dollars = Math.ceil(maxCents / 100);
  const bands = [5000, 10000, 25000, 50000, 100000];
  for (const b of bands) {
    if (dollars <= b) return `Up to $${formatMoney(b)}`;
  }
  return '$100,000+';
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return null;
  try {
    if (start && !end) return new Date(start).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    if (start && end) {
      const s = new Date(start).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      const e = new Date(end).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${s} – ${e}`;
    }
    if (end) return new Date(end).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {}
  return null;
}

function isLikelyRlsRejection(err: any): boolean {
  const code = String(err?.code ?? '').trim();
  const message = String(err?.message ?? '').toLowerCase();
  const details = String(err?.details ?? '').toLowerCase();
  const combined = `${message} ${details}`;
  if (code === '42501') return true;
  if (combined.includes('row-level security')) return true;
  if (combined.includes('row level security')) return true;
  if (combined.includes('permission denied')) return true;
  return false;
}

function isPremiumPoster(t: any, builders: BuilderMap): boolean {
  if (t?.is_name_hidden) return false;
  const b = builders?.[t?.builder_id];
  return !!(b?.is_premium);
}

function getTenderDistanceKm(t: any): number | null {
  const raw = t?.distance_km ?? t?.distanceKm ?? null;
  const n = typeof raw === 'number' ? raw : raw != null ? Number(raw) : null;
  return Number.isFinite(n as number) ? (n as number) : null;
}

function isBuilderVerified(t: any, builders: BuilderMap): boolean {
  if (t?.is_name_hidden) return false;
  const b = builders?.[t?.builder_id];
  const status = String(b?.abn_status ?? '').toUpperCase();
  const hasVerifiedAt = !!b?.abn_verified_at;
  return status === 'VERIFIED' && hasVerifiedAt;
}

function getPosterNameFromRow(t: any, builders: BuilderMap): string {
  if (t?.is_name_hidden) return 'Builder (hidden)';
  const b = builders?.[t?.builder_id];
  return (
    b?.business_name ??
    b?.name ??
    'Builder'
  );
}

function getPosterAvatarFromBuilders(t: any, builders: BuilderMap): string | undefined {
  if (t?.is_name_hidden) return undefined;
  const b = builders?.[t?.builder_id];
  return b?.avatar_url ?? undefined;
}

function getPosterRatingFromBuilders(t: any, builders: BuilderMap): { rating: number | null; count: number | null } {
  if (t?.is_name_hidden) return { rating: null, count: null };
  const b = builders?.[t?.builder_id];
  const rating = b?.rating != null ? Number(b.rating) : null;
  const count = b?.rating_count != null ? Number(b.rating_count) : null;
  return {
    rating: Number.isFinite(rating as any) ? rating : null,
    count: Number.isFinite(count as any) ? count : null,
  };
}

export default function TendersPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { currentUser } = useAuth();
  const myUserId = currentUser?.id ?? null;
  const isAdminUser = isAdmin(currentUser);

  const userForDiscovery = currentUser
    ? {
        is_premium: (currentUser as any).isPremium ?? (currentUser as any).is_premium ?? undefined,
        subscription_status:
          (currentUser as any).subscriptionStatus ?? (currentUser as any).subscription_status ?? null,
        active_plan: (currentUser as any).activePlan ?? (currentUser as any).active_plan ?? null,
        subcontractor_plan: undefined,
        subcontractor_sub_status: undefined,
      }
    : null;

  const isPremium = isPremiumForDiscovery(userForDiscovery);
  const allowedRadiusKm = isPremium ? 100 : 20;
  const TradeIcon = getTradeIcon((currentUser as any)?.primaryTrade ?? undefined);

  const [view, setView] = useState<'find' | 'posts'>('find');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'DRAFT' | 'PENDING_APPROVAL' | 'LIVE' | 'CLOSED'>('all');
  const [myTab, setMyTab] = useState<'LIVE' | 'DRAFT' | 'CLOSED' | 'PENDING_APPROVAL'>('LIVE');
  const [sortMode, setSortMode] = useState<'newest' | 'nearest'>('newest');

  const [findRows, setFindRows] = useState<TenderRow[]>([]);
  const [myRows, setMyRows] = useState<TenderRow[]>([]);
  const [builders, setBuilders] = useState<BuilderMap>({});
  const [budgetMap, setBudgetMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeConfirmTenderId, setCloseConfirmTenderId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmTenderId, setDeleteConfirmTenderId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [requestingTenderId, setRequestingTenderId] = useState<string | null>(null);

  const isBusy = isClosing || isDeleting || isCancelling;

  const selectColumns = `id,builder_id,status,tier,is_anonymous,is_name_hidden,project_name,project_description,suburb,postcode,created_at,desired_start_date,desired_end_date`;

  async function fetchBuilderNames(builderIds: string[]): Promise<BuilderMap> {
    const uniq = Array.from(new Set(builderIds.filter(Boolean)));
    const empty: BuilderMap = {};
    if (uniq.length === 0) return empty;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id,name,business_name,avatar,rating,abn_status,abn_verified_at,is_premium')
        .in('id', uniq);
      if (error) throw error;
      const map: BuilderMap = {};
      for (const u of (data as any[]) || []) {
        map[u.id] = {
          id: u.id,
          name: u.name ?? null,
          business_name: u.business_name ?? null,
          avatar_url: u.avatar ?? null,
          rating: u.rating != null ? Number(u.rating) : null,
          rating_count: null,
          abn_status: u.abn_status ?? null,
          abn_verified_at: u.abn_verified_at ?? null,
          is_premium: (u as any).is_premium ?? null,
        };
      }
      setBuilders((prev) => ({ ...prev, ...map }));
      return { ...map };
    } catch (e) {
      console.warn('[Tenders] Failed to load builder names', e);
      return empty;
    }
  }

  async function fetchTenderBudgets(tenderIds: string[]) {
    const uniq = Array.from(new Set(tenderIds.filter(Boolean)));
    if (uniq.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('tender_trade_requirements')
        .select('tender_id,max_budget_cents')
        .in('tender_id', uniq);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data as any[]) || []) {
        const tenderId = row.tender_id as string;
        const maxCents = row.max_budget_cents as number | null;
        if (!tenderId || !maxCents) continue;
        const current = map[tenderId];
        if (!current || maxCents > current) map[tenderId] = maxCents;
      }
      setBudgetMap((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.warn('[Tenders] Failed to load budgets', e);
    }
  }

  async function fetchTenders() {
    setLoading(true);
    try {
      // Find Work: live tenders, exclude own
      if (view === 'find') {
        let q = supabase
          .from('tenders')
          .select(selectColumns)
          .is('deleted_at', null);

        if (!isAdminUser) q = q.in('status', ['PUBLISHED', 'LIVE']);
        if (myUserId) q = q.neq('builder_id', myUserId);
        if (status !== 'all') {
          if (status === 'LIVE') q = q.in('status', ['PUBLISHED', 'LIVE']);
          else q = q.eq('status', status);
        }
        if (search.trim()) {
          const s = `%${search.trim()}%`;
          q = q.or(`project_name.ilike.${s},suburb.ilike.${s}`);
        }

        const orderAscending = false;
        // NOTE: We don't have distance for tenders yet (like jobs RPC).
        // Keep "Nearest" UI for now but fallback to newest ordering.
        // Later: implement a tenders RPC that returns distance_km.
        const { data, error } = await q.order('created_at', { ascending: orderAscending });
        if (error) throw error;
        const list = (data ?? []) as TenderRow[];

        const buildersMap = await fetchBuilderNames(list.map((t) => t.builder_id).filter(Boolean));
        await fetchTenderBudgets(list.map((t) => t.id));

        let quoteRequestMap: Record<string, string> = {};
        const anonymousTenderIds = list.filter((t: any) => t?.is_anonymous).map((t: any) => t.id);
        if (myUserId && anonymousTenderIds.length > 0) {
          const { data: reqData } = await supabase
            .from('tender_quote_requests')
            .select('tender_id, status')
            .in('tender_id', anonymousTenderIds)
            .eq('requester_id', myUserId);
          for (const r of (reqData ?? []) as { tender_id: string; status: string }[]) {
            quoteRequestMap[r.tender_id] = r.status;
          }
        }

        const listWithRequests = list.map((t: any) => ({
          ...t,
          quote_request_status: quoteRequestMap[t.id] ?? null,
        }));

        const sorted = listWithRequests.slice().sort((a: any, b: any) => {
          const ap = isPremiumPoster(a, buildersMap);
          const bp = isPremiumPoster(b, buildersMap);
          if (bp !== ap) return Number(bp) - Number(ap);

          const at = new Date(a?.created_at ?? 0).getTime();
          const bt = new Date(b?.created_at ?? 0).getTime();
          return bt - at;
        });

        setFindRows(sorted as TenderRow[]);
        setMyRows([]);
      } else {
        // My Tenders: own tenders only
        if (!myUserId) {
          setMyRows([]);
          setFindRows([]);
          setLoading(false);
          return;
        }

        let q = supabase
          .from('tenders')
          .select(selectColumns)
          .is('deleted_at', null)
          .eq('builder_id', myUserId);

        if (search.trim()) {
          const s = `%${search.trim()}%`;
          q = q.or(`project_name.ilike.${s},suburb.ilike.${s}`);
        }

        const orderAscending = false;
        const { data, error } = await q.order('created_at', { ascending: orderAscending });
        if (error) throw error;
        const list = (data ?? []) as TenderRow[];

        // Fetch quote counts from view and merge
        const tenderIds = list.map((t) => t.id);
        let quoteCountMap: Record<string, number> = {};
        if (tenderIds.length > 0) {
          const { data: countsData } = await supabase
            .from('tender_quote_counts')
            .select('tender_id, quotes_received')
            .in('tender_id', tenderIds);
          for (const row of (countsData ?? []) as { tender_id: string; quotes_received: number }[]) {
            quoteCountMap[row.tender_id] = row.quotes_received ?? 0;
          }
        }

        const mapped = list.map((t) => ({
          ...t,
          quotes_received: quoteCountMap[t.id] ?? 0,
        }));
        setMyRows(mapped);
        setFindRows([]);
        await Promise.all([
          fetchTenderBudgets(list.map((t) => t.id)),
          fetchBuilderNames(list.map((t) => t.builder_id).filter(Boolean)),
        ]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load tenders');
      setFindRows([]);
      setMyRows([]);
      setBudgetMap({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTenders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, status, myUserId]);

  useEffect(() => {
    const t = setTimeout(() => fetchTenders(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCloseTender(tenderId: string) {
    if (!myUserId) return toast.error('You must be logged in.');
    setIsClosing(true);
    try {
      const { error } = await supabase.rpc('close_tender', { p_tender_id: tenderId });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('already_closed')) toast.error('This tender is already closed.');
        else if (msg.includes('not_owner')) toast.error('You can only close your own tender.');
        else toast.error('Could not close tender.');
        return;
      }
      toast.success('Tender closed');
      await fetchTenders();
    } catch (e: any) {
      console.error('[tenders] close failed', e);
      toast.error('Could not close tender.');
    } finally {
      setIsClosing(false);
      setCloseConfirmOpen(false);
      setCloseConfirmTenderId(null);
    }
  }

  async function handleCancelTender(tenderId: string) {
    if (!myUserId) return toast.error('You must be logged in.');
    setIsCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_tender', { p_tender_id: tenderId });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('already_cancelled')) toast.error('This tender is already cancelled.');
        else if (msg.includes('cannot_cancel_closed')) toast.error('Closed tenders can\'t be cancelled.');
        else if (msg.includes('not_owner')) toast.error('You can only cancel your own tender.');
        else toast.error('Could not cancel tender.');
        return;
      }
      toast.success('Tender cancelled');
      await fetchTenders();
    } catch (e) {
      console.error('[tenders] cancel failed', e);
      toast.error('Could not cancel tender.');
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleReopenTender(tenderId: string) {
    if (!myUserId) return toast.error('You must be logged in.');
    setReopeningId(tenderId);
    try {
      const { error } = await supabase.rpc('reopen_tender', { p_tender_id: tenderId });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('free_cannot_reopen_closed_tender')) toast.error('Free plan cannot reopen closed tenders. Upgrade to Premium.');
        else if (msg.includes('not_owner')) toast.error('You can only reopen your own tender.');
        else if (msg.includes('tender_not_closed')) toast.error('This tender is not closed.');
        else toast.error('Could not reopen tender.');
        return;
      }
      toast.success('Tender reopened');
      await fetchTenders();
    } catch (e: any) {
      console.error('[tenders] reopen failed', e);
      toast.error('Could not reopen tender.');
    } finally {
      setReopeningId(null);
    }
  }

  async function handleRequestToQuote(tenderId: string) {
    if (!myUserId) {
      toast.error('You must be logged in to request to quote.');
      return;
    }
    setRequestingTenderId(tenderId);
    try {
      const { error } = await supabase.rpc('request_to_quote', { p_tender_id: tenderId });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('not_authenticated')) toast.error('Please log in to request.');
        else if (msg.includes('tender_not_found')) toast.error('Tender not found.');
        else if (msg.includes('tender_not_anonymous')) toast.error('This tender is not anonymous.');
        else toast.error('Could not send request.');
        return;
      }
      toast.success('Quote request sent');
      await fetchTenders();
    } catch (e: any) {
      console.error('[tenders] request to quote failed', e);
      toast.error('Could not send request.');
    } finally {
      setRequestingTenderId(null);
    }
  }

  async function deleteTender(tenderId: string) {
    if (!myUserId) return toast.error('You must be logged in.');
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_tender', { p_tender_id: tenderId });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('not_owner')) toast.error("You don't have permission to delete this tender.");
        else if (msg.includes('tender_not_found')) toast.error('Tender not found.');
        else if (msg.includes('not_authenticated')) toast.error('Please log in to delete tenders.');
        else toast.error('Could not delete tender.');
        return;
      }
      toast.success('Tender deleted');
      await fetchTenders();
    } catch (e: any) {
      console.error('[tenders] delete failed', e);
      toast.error('Could not delete tender.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmTenderId(null);
    }
  }

  const findTenders = view === 'find' ? findRows : [];
  const myTenders = view === 'posts' ? myRows : [];

  const hasPending = (myTenders || []).some((t) => t.status === 'PENDING_APPROVAL');

  // Reset myTab when Pending tab is hidden (no pending tenders)
  useEffect(() => {
    if (!hasPending && myTab === 'PENDING_APPROVAL') {
      setMyTab('LIVE');
    }
  }, [hasPending, myTab]);

  const visibleMyTenders = useMemo(() => {
    const list = myTenders || [];
    if (myTab === 'CLOSED') {
      return list.filter((t) => t.status === 'CLOSED' || t.status === 'CANCELLED');
    }
    if (myTab === 'LIVE') {
      return list.filter((t) => ['PUBLISHED', 'LIVE'].includes(String(t.status || '').toUpperCase()));
    }
    return list.filter((t) => String(t.status || '').toUpperCase() === myTab);
  }, [myTenders, myTab]);

  function TenderRow({
    tender,
    showActions = false,
    onDeleteClick,
    onCloseClick,
    onReopenClick,
    onCancelClick,
    onRequestToQuote,
    budgetCents,
    quotesReceived,
    isClosing,
    isPremium,
    reopeningId,
    isBusy,
    isRequesting,
    builders,
  }: {
    tender: TenderRow;
    showActions?: boolean;
    onDeleteClick?: (id: string) => void;
    onCloseClick?: (id: string) => void;
    onReopenClick?: (id: string) => void;
    onCancelClick?: (id: string) => void;
    onRequestToQuote?: (id: string) => void;
    budgetCents?: number | null;
    quotesReceived?: number;
    isClosing?: boolean;
    isPremium?: boolean;
    reopeningId?: string | null;
    isBusy?: boolean;
    isRequesting?: boolean;
    builders?: BuilderMap;
  }) {
    const tierLabel = prettyTier(tender.tier);
    const priceLabel = priceBandLabelFromCents(budgetCents ?? null);
    const dateLabel = formatDateRange(tender.desired_start_date, tender.desired_end_date);
    const buildersMap = builders ?? {};
    const posterName = getPosterNameFromRow(tender, buildersMap);
    const posterAvatar = getPosterAvatarFromBuilders(tender, buildersMap);
    const { rating, count } = getPosterRatingFromBuilders(tender, buildersMap);
    const isOpen = ['PUBLISHED', 'LIVE'].includes(String(tender.status || '').toUpperCase());
    const isClosed = ['CLOSED', 'CANCELLED'].includes(String(tender.status || '').toUpperCase());
    const isClosedOnly = String(tender.status || '').toUpperCase() === 'CLOSED'; // Reopen only for CLOSED, not CANCELLED
    const isDraft = String(tender.status || '').toUpperCase() === 'DRAFT';
    const isLive = isOpen;

    return (
      <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <Link
            href={`/tenders/${tender.id}`}
            className="block rounded-lg px-4 py-4 hover:bg-white/60"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* LEFT: title + trade/tier + poster */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {tender.project_name}
                  </div>
                  {String(tender.status || '').toUpperCase() === 'CANCELLED' ? (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                      {prettyStatus(tender.status)}
                    </Badge>
                  ) : (
                    <Badge variant={statusVariant(tender.status) as any}>{prettyStatus(tender.status)}</Badge>
                  )}
                  {tierLabel ? (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      {tierLabel}
                    </Badge>
                  ) : null}
                  {priceLabel ? (
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      {priceLabel}
                    </Badge>
                  ) : null}
                  {showActions && typeof quotesReceived === 'number' && isLive ? (
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      {quotesReceived === 1 ? '1 quote' : `${quotesReceived} quotes`}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {tender.is_anonymous ? (
                    showActions ? (
                      <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-sm font-medium text-slate-700">Posted anonymously</div>
                      </div>
                    ) : tender.quote_request_status === 'ACCEPTED' ? (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Request accepted</div>
                      <Button
                        asChild
                        size="sm"
                        className="h-8"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/tenders/${tender.id}#quotes`}>Submit quote</Link>
                      </Button>
                    </div>
                  ) : tender.quote_request_status ? (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Request sent</div>
                      <Button size="sm" variant="secondary" disabled className="h-8">
                        Request sent
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-700">Request to quote</div>
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={!!isRequesting}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRequestToQuote?.(tender.id);
                        }}
                      >
                        {isRequesting ? 'Sending...' : 'Request'}
                      </Button>
                    </div>
                  )
                  ) : (
                    <div className="flex items-center gap-2">
                      <ProfileAvatar
                        userId={tender.builder_id}
                        currentAvatarUrl={posterAvatar}
                        userName={posterName}
                        onAvatarUpdate={() => {}}
                        editable={false}
                        size={32}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-sm font-medium text-slate-700">
                            {posterName}
                          </div>
                          {isBuilderVerified(tender, buildersMap) ? (
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 gap-1"
                            >
                              <BadgeCheck className="h-3.5 w-3.5 text-sky-600" />
                              Verified
                            </Badge>
                          ) : null}
                        </div>
                        {rating != null ? (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            <span className="font-medium text-slate-600">{rating.toFixed(1)}</span>
                            {count != null ? <span className="text-slate-400">({count})</span> : null}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">New</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MIDDLE: description */}
              <div className="min-w-0 sm:flex-1">
                {tender.project_description ? (
                  <div className="truncate text-sm text-slate-600">
                    {tender.project_description}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No description</div>
                )}
              </div>

              {/* RIGHT: meta icons (Jobs style) + actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-end">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  {(tender.suburb || tender.postcode) ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-sky-600" />
                      <span>{[tender.suburb, tender.postcode].filter(Boolean).join(', ')}</span>
                    </div>
                  ) : null}
                  {dateLabel ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <span>{dateLabel}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {showActions ? (
                    <>
                      {isLive && (quotesReceived ?? 0) >= 1 ? (
                        <Button asChild variant="secondary" size="sm" className="h-9">
                          <Link href={`/tenders/${tender.id}#quotes`}>View quotes</Link>
                        </Button>
                      ) : null}
                      {isOpen ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600"
                          disabled={!!isBusy}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCloseClick?.(tender.id);
                          }}
                          title="Close tender"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Close</span>
                        </button>
                      ) : null}
                      {isOpen && onCancelClick ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 border-red-200 text-red-700 hover:bg-red-50"
                          disabled={!!isBusy}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCancelClick(tender.id);
                          }}
                        >
                          Cancel
                        </Button>
                      ) : null}
                      {isClosedOnly && isPremium && onReopenClick ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600"
                          disabled={!!isBusy}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReopenClick(tender.id);
                          }}
                          title="Reopen tender"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Reopen</span>
                        </button>
                      ) : null}
                      {(isDraft || isOpen || isClosed) && onDeleteClick ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50"
                          disabled={!!isBusy}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteClick(tender.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <ArrowRight className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <AppLayout transparentBackground>
      {/* PRICING-STYLE BLUE WRAPPER */}
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
        {/* Dotted overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        {/* White watermark (fixed like Pricing) */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-whiteout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.08]"
          />
        </div>

        {/* PAGE CONTENT */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {/* Header row (Jobs structure, but white text) */}
          <div className="mb-4 flex flex-col gap-2 sm:mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 shadow-sm ring-1 ring-white/15 backdrop-blur">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Tenders</h1>
              </div>
              <p className="mt-1 text-sm text-white/80">
                View available tenders or manage the ones you&apos;ve posted
              </p>
            </div>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as 'find' | 'posts')}>
            {!isPremium && (
              <PremiumUpsellBar
                title={`No tenders within your ${allowedRadiusKm}km radius.`}
                description="Premium expands your radius to 100km, increases your visibility, and allows you to post more tenders — so you can win more work."
                className="mb-6"
              />
            )}

            {/* Main surface (Jobs-style card but glass on blue) */}
            <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader className="border-b border-black/5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Tabs */}
                  <TabsList className="w-full justify-start rounded-2xl bg-slate-100/80 p-1 ring-1 ring-black/5 sm:w-auto">
                    <TabsTrigger value="find" className="rounded-xl px-4">
                      View available tenders
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="rounded-xl px-4">
                      My Tenders
                    </TabsTrigger>
                  </TabsList>

                  {/* CTA (match Jobs positioning/style) */}
                  <Link href="/tenders/create">
                    <Button
                      className="h-10 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      Post Tender
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                <TabsContent value="find" className="mt-6">
                  {/* Showing + Radius + Sort row (match jobs) */}
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <span>Showing tenders in your trade:</span>
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                          {TradeIcon ? <TradeIcon className="h-4 w-4 text-blue-600" /> : null}
                          {String((currentUser as any)?.primaryTrade || 'Your trade')}
                        </span>
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
                        <span className="text-slate-500">Radius</span>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {allowedRadiusKm}km radius
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Sort:</span>

                      <button
                        type="button"
                        onClick={() => setSortMode('newest')}
                        className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-black/5 ${
                          sortMode === 'newest'
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-100/70 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Newest
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortMode('nearest');
                          toast.info('Nearest sorting will be enabled when tenders include distance (RPC).');
                        }}
                        className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-black/5 ${
                          sortMode === 'nearest'
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-100/70 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Nearest
                      </button>
                    </div>
                  </div>

                  {/* Search + status controls */}
                  <div className="mb-4 flex w-full flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by project name or suburb..."
                      className="md:flex-1"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button variant={status === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('all')}>
                        All
                      </Button>
                      <Button variant={status === 'LIVE' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('LIVE')}>
                        Live
                      </Button>
                    </div>
                  </div>

                  {/* List render */}
                  <div className="space-y-3">
                    {loading ? (
                      <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur">
                        <CardContent className="p-6 text-sm text-muted-foreground">Loading tenders…</CardContent>
                      </Card>
                    ) : findTenders.length === 0 ? (
                      <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur">
                        <CardContent className="p-6">
                          <div className="text-base font-medium">No tenders found</div>
                          <div className="mt-1 text-sm text-muted-foreground">Try changing filters or search.</div>
                        </CardContent>
                      </Card>
                    ) : (
                      findTenders.map((t) => (
                        <TenderRow
                          key={t.id}
                          tender={t}
                          budgetCents={budgetMap[t.id]}
                          builders={builders}
                          onRequestToQuote={handleRequestToQuote}
                          isRequesting={requestingTenderId === t.id}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="posts" className="mt-6">
                  <div className="mb-4 flex w-full flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by project name or suburb..."
                      className="md:flex-1"
                    />
                  </div>

                  <Tabs value={myTab} onValueChange={(v) => setMyTab(v as typeof myTab)} className="mt-3">
                    <TabsList
                      className={`grid w-full max-w-xl ${hasPending ? 'grid-cols-4' : 'grid-cols-3'}`}
                    >
                      <TabsTrigger value="LIVE">Live</TabsTrigger>
                      <TabsTrigger value="DRAFT">Draft</TabsTrigger>
                      {hasPending ? (
                        <TabsTrigger value="PENDING_APPROVAL">Pending</TabsTrigger>
                      ) : null}
                      <TabsTrigger value="CLOSED">Closed</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="mt-4 space-y-3">
                  {loading ? (
                    <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur">
                      <CardContent className="p-6 text-sm text-muted-foreground">Loading tenders…</CardContent>
                    </Card>
                  ) : visibleMyTenders.length === 0 ? (
                    <Card className="border-white/15 bg-white/90 shadow-sm backdrop-blur">
                        <CardContent className="p-6">
                          <div className="text-base font-medium">
                            {myTenders.length === 0
                              ? "You haven't created any tenders yet"
                              : `No ${myTab === 'LIVE' ? 'live' : myTab === 'DRAFT' ? 'draft' : myTab === 'PENDING_APPROVAL' ? 'pending' : 'closed'} tenders`}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {myTenders.length === 0
                              ? 'Click "Post Tender" to create your first tender.'
                              : 'Try another tab.'}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      visibleMyTenders.map((t) => (
                        <TenderRow
                          key={t.id}
                          tender={t}
                          showActions
                          budgetCents={budgetMap[t.id]}
                          quotesReceived={t.quotes_received}
                          onCancelClick={handleCancelTender}
                          onDeleteClick={(id) => {
                            setDeleteConfirmTenderId(id);
                            setDeleteConfirmOpen(true);
                          }}
                          onCloseClick={(id) => {
                            if (!isPremium) {
                              setCloseConfirmTenderId(id);
                              setCloseConfirmOpen(true);
                            } else {
                              handleCloseTender(id);
                            }
                          }}
                          onReopenClick={handleReopenTender}
                          isClosing={isClosing}
                          isPremium={isPremium}
                          reopeningId={reopeningId}
                          isBusy={isBusy}
                          builders={builders}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>

      {/* Confirm Close (Free plan warning) */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close tender?</AlertDialogTitle>
            <AlertDialogDescription>
              Free plan allows 1 tender per month.
              <br />
              If you close this tender, you won&apos;t be able to reopen it this month.
              <br />
              Upgrade to Premium to post more tenders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isClosing || !closeConfirmTenderId}
              onClick={(e) => {
                e.preventDefault();
                if (closeConfirmTenderId && !isClosing) handleCloseTender(closeConfirmTenderId);
              }}
            >
              {isClosing ? 'Closing…' : 'Close permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tender?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the tender from your account.
              <br />
              <span className="mt-2 inline-block font-medium text-slate-900">
                This action can&apos;t be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || !deleteConfirmTenderId}
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirmTenderId && !isDeleting) deleteTender(deleteConfirmTenderId);
              }}
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
