'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TenderRowCard } from '@/components/tenders/TenderRowCard';
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
import { FileText, Plus } from 'lucide-react';

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

/** Alias to avoid parser confusion with inner component */
type TenderRowData = TenderRow;

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

export default function TendersPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { currentUser } = useAuth();
  const myUserId = currentUser?.id ?? null;
  const isAdminUser = isAdmin(currentUser);

  const userForDiscovery = currentUser
    ? {
        plan: (currentUser as any).plan ?? null,
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
  const [requestingTenderId, setRequestingTenderId] = useState<string | null>(null);
  const geocodeAttemptedRef = useRef(false);

  const isBusy = isClosing || isDeleting;

  const viewerTrades = useMemo(() => {
    const t = (currentUser as any)?.trades;
    if (Array.isArray(t) && t.length > 0) {
      return t.filter((x: string) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    }
    const pt = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade;
    return pt ? [String(pt).trim()] : [];
  }, [currentUser]);

  const tradeFilterForRpc = viewerTrades.length > 0 ? viewerTrades.join('|') : null;

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
      // Find Work: use RPC for trade + radius filtering (same as jobs). AI-generated and manual tenders use same tender_trade_requirements.
      if (view === 'find') {
        let list: TenderRow[] = [];

        if (myUserId) {
          const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('get_tenders_visible_to_viewer', {
            viewer_id: myUserId,
            trade_filter: tradeFilterForRpc,
            limit_count: 100,
            offset_count: 0,
          });

          if (rpcErr) {
            console.error('[tenders] RPC error', rpcErr);
            throw rpcErr;
          }

          const rows = (Array.isArray(rpcData) ? rpcData : []) as any[];
          list = rows.map((r: any) => ({
            id: r.id,
            builder_id: r.builder_id,
            status: r.status,
            tier: r.tier,
            is_anonymous: r.is_anonymous,
            is_name_hidden: r.is_name_hidden,
            project_name: r.project_name,
            project_description: r.project_description,
            suburb: r.suburb,
            postcode: r.postcode,
            created_at: r.created_at,
            desired_start_date: r.desired_start_date,
            desired_end_date: r.desired_end_date,
            distance_km: r.distance_km,
          }));

          if (process.env.NODE_ENV === 'development') {
            const hasCoords = (currentUser as any)?.lat != null && (currentUser as any)?.lng != null;
            if (list.length > 0) {
              console.log('[tenders] discovery matched', list.length, 'tenders for viewer trades', viewerTrades, 'tradeFilterForRpc', tradeFilterForRpc, 'radius_km', rows[0]?.viewer_radius_km);
            } else if (myUserId) {
              console.log('[tenders] discovery: 0 tenders. viewerTrades=', viewerTrades, 'tradeFilterForRpc=', tradeFilterForRpc, 'viewerHasCoords=', hasCoords, 'location=', (currentUser as any)?.location, 'postcode=', (currentUser as any)?.postcode);
            }
          }
        }

        if (search.trim()) {
          const s = search.trim().toLowerCase();
          list = list.filter(
            (t: any) =>
              (t.project_name ?? '').toLowerCase().includes(s) || (t.suburb ?? '').toLowerCase().includes(s)
          );
        }

        if (status !== 'all') {
          if (status === 'LIVE') list = list.filter((t: any) => ['PUBLISHED', 'LIVE'].includes(String(t.status || '')));
          else list = list.filter((t: any) => String(t.status || '') === status);
        }

        const buildersMap = await fetchBuilderNames(list.map((t) => t.builder_id).filter(Boolean));
        await fetchTenderBudgets(list.map((t) => t.id));

        let quoteRequestMap: Record<string, string> = {};
        const tenderIdsForRequests = list.map((t: any) => t.id);
        if (myUserId && tenderIdsForRequests.length > 0) {
          const { data: reqData } = await supabase
            .from('tender_quote_requests')
            .select('tender_id, status')
            .in('tender_id', tenderIdsForRequests)
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

  // Backfill coords for users who signed up before we captured lat/lng (enables radius filtering)
  useEffect(() => {
    if (!myUserId || view !== 'find' || geocodeAttemptedRef.current) return;
    const loc = (currentUser as any)?.location;
    const hasCoords = (currentUser as any)?.lat != null && (currentUser as any)?.lng != null;
    if (!hasCoords && typeof loc === 'string' && loc.trim()) {
      geocodeAttemptedRef.current = true;
      fetch('/api/profile/geocode-location', { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data?.skipped !== 'already_has_coords') {
            fetchTenders();
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId, view, currentUser?.id, (currentUser as any)?.location, (currentUser as any)?.lat]);

  useEffect(() => {
    fetchTenders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, status, myUserId, tradeFilterForRpc]);

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
      const res = await fetch(`/api/tenders/${tenderId}/request-quote`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Could not send request.');
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
      const res = await fetch(`/api/tenders/${tenderId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) toast.error("You don't have permission to delete this tender.");
        else if (res.status === 404) toast.error('Tender not found.');
        else if (res.status === 401) toast.error('Please log in to delete tenders.');
        else toast.error(data?.error || 'Could not delete tender.');
        return;
      }
      toast.success('Tender deleted');
      await fetchTenders();
    } catch (e: unknown) {
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
                        <TenderRowCard
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
                        <TenderRowCard
                          key={t.id}
                          tender={t}
                          showActions
                          budgetCents={budgetMap[t.id]}
                          quotesReceived={t.quotes_received}
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
              This will permanently delete this tender and its related files/data. This cannot be undone.
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
              {isDeleting ? 'Deleting…' : 'Delete tender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
