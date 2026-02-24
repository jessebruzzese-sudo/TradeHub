'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { getBrowserSupabase } from '@/lib/supabase-client';

import { toast } from 'sonner';
import { Trash2, MapPin, FileText, ArrowRight, Tag, User as UserIcon, DollarSign } from 'lucide-react';

type TenderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'LIVE' | 'CLOSED' | string;

type TenderRow = {
  id: string;
  builder_id: string;
  status: TenderStatus;
  tier: string | null;
  is_name_hidden: boolean | null;

  project_name: string;
  project_description: string | null;

  suburb: string | null;
  postcode: string | null;

  // NOTE: your DB screenshot didn’t show created_at, so we do not rely on it
  created_at?: string | null;
};

type BuilderMap = Record<string, { id: string; name: string | null }>;

function statusVariant(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'LIVE') return 'default';
  if (s === 'PENDING_APPROVAL') return 'secondary';
  if (s === 'DRAFT') return 'secondary';
  if (s === 'CLOSED') return 'outline';
  return 'outline';
}

function prettyStatus(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'LIVE') return 'Live';
  if (s === 'PENDING_APPROVAL') return 'Pending approval';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'CLOSED') return 'Closed';
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

export default function TendersPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);

  const { currentUser } = useAuth();
  const myUserId = currentUser?.id ?? null;
  const isAdminUser = isAdmin(currentUser);

  const [view, setView] = useState<'listed' | 'mine'>('listed');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'DRAFT' | 'PENDING_APPROVAL' | 'LIVE' | 'CLOSED'>('all');

  const [rows, setRows] = useState<TenderRow[]>([]);
  const [builders, setBuilders] = useState<BuilderMap>({});
  const [budgetMap, setBudgetMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  async function fetchBuilderNames(builderIds: string[]) {
    const uniq = Array.from(new Set(builderIds.filter(Boolean)));
    if (uniq.length === 0) return;

    try {
      const { data, error } = await supabase.from('users').select('id,name').in('id', uniq);
      if (error) throw error;

      const map: BuilderMap = {};
      (data || []).forEach((u: any) => {
        map[u.id] = { id: u.id, name: u.name ?? null };
      });

      setBuilders((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.warn('[Tenders] Failed to load builder names:', e);
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
        if (!current || maxCents > current) {
          map[tenderId] = maxCents;
        }
      }

      setBudgetMap(map);
    } catch (e) {
      console.warn('[Tenders] Failed to load budgets', e);
      setBudgetMap({});
    }
  }

  async function fetchTenders() {
    setLoading(true);

    try {
      let q = supabase
        .from('tenders')
        .select('id,builder_id,status,tier,is_name_hidden,project_name,project_description,suburb,postcode')
        .is('deleted_at', null);

      // =========================
      // Visibility / View rules
      // =========================
      if (view === 'listed') {
        if (!isAdminUser) {
          // Public feed should only show live tenders
          q = q.in('status', ['PUBLISHED', 'LIVE']);
        }
        // Hide my own from "Listed"
        if (myUserId) q = q.neq('builder_id', myUserId);

        // Status filter in Listed is optional; keep it safe
        if (status !== 'all') {
          if (status === 'LIVE') {
            q = q.in('status', ['PUBLISHED', 'LIVE']);
          } else {
            // If user selects Draft/Pending in Listed, it will return 0 (safe)
            q = q.eq('status', status);
          }
        }
      }

      if (view === 'mine') {
        if (myUserId) q = q.eq('builder_id', myUserId);

        if (status !== 'all') {
          if (status === 'LIVE') {
            q = q.in('status', ['PUBLISHED', 'LIVE']);
          } else {
            q = q.eq('status', status);
          }
        }
      }

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`project_name.ilike.${s},suburb.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const list = (data ?? []) as TenderRow[];
      setRows(list);

      await Promise.all([fetchBuilderNames(list.map((t) => t.builder_id)), fetchTenderBudgets(list.map((t) => t.id))]);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load tenders');
      setRows([]);
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

  const emptyTitle = useMemo(() => {
    if (view === 'listed') return 'No tenders found';
    return 'You haven’t created any tenders yet';
  }, [view]);

  const emptyHint = useMemo(() => {
    if (view === 'listed') return 'Try changing filters or search.';
    return 'Click “Create Tender” to post your first tender.';
  }, [view]);

  async function deleteTender(tenderId: string) {
    if (!myUserId) return;

    const ok = window.confirm('Delete this tender? This cannot be undone.');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('tenders')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', tenderId)
        .eq('builder_id', myUserId);
      if (error) throw error;

      toast.success('Tender deleted');
      setRows((prev) => prev.filter((r) => r.id !== tenderId));

      setBudgetMap((prev) => {
        const next = { ...prev };
        delete next[tenderId];
        return next;
      });
    } catch (e: any) {
      console.error(e);
      if (isLikelyRlsRejection(e)) {
        toast.error("You don't have permission to delete this tender.");
      } else {
        toast.error('Failed to delete tender');
      }
    }
  }

  const showDraftFilter = view === 'mine';
  const showPendingFilter = view === 'mine';
  const showClosedFilter = view === 'mine' || isAdmin;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tenders</h1>
            <p className="mt-1 text-sm text-muted-foreground">Browse live project tenders or manage the ones you’ve posted.</p>
          </div>

          <Button asChild className="gap-2">
            <Link href="/tenders/create">+ Create Tender</Link>
          </Button>
        </div>

        <Card className="mt-5">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full md:w-auto">
                <TabsList>
                  <TabsTrigger value="listed">Listed Tenders</TabsTrigger>
                  <TabsTrigger value="mine">My Tenders</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex w-full flex-col gap-2 md:w-[560px] md:flex-row">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by project name or suburb..." />

                <div className="flex flex-wrap gap-2">
                  <Button variant={status === 'all' ? 'default' : 'outline'} onClick={() => setStatus('all')}>
                    All
                  </Button>

                  {showDraftFilter ? (
                    <Button variant={status === 'DRAFT' ? 'default' : 'outline'} onClick={() => setStatus('DRAFT')}>
                      Draft
                    </Button>
                  ) : null}

                  {showPendingFilter ? (
                    <Button
                      variant={status === 'PENDING_APPROVAL' ? 'default' : 'outline'}
                      onClick={() => setStatus('PENDING_APPROVAL')}
                    >
                      Pending
                    </Button>
                  ) : null}

                  <Button variant={status === 'LIVE' ? 'default' : 'outline'} onClick={() => setStatus('LIVE')}>
                    Live
                  </Button>

                  {showClosedFilter ? (
                    <Button variant={status === 'CLOSED' ? 'default' : 'outline'} onClick={() => setStatus('CLOSED')}>
                      Closed
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Loading tenders…</CardContent>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-base font-medium">{emptyTitle}</div>
                <div className="mt-1 text-sm text-muted-foreground">{emptyHint}</div>
              </CardContent>
            </Card>
          ) : (
            rows.map((t) => {
              const isMine = !!myUserId && t.builder_id === myUserId;
              const tierLabel = prettyTier(t.tier);

              const builderName = t.is_name_hidden ? 'Builder (hidden)' : builders[t.builder_id]?.name ?? 'View profile';
              const priceLabel = priceBandLabelFromCents(budgetMap[t.id]);

              return (
                <Card key={t.id} className="hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-lg font-semibold">{t.project_name}</div>

                          <Badge variant={statusVariant(t.status) as any}>{prettyStatus(t.status)}</Badge>

                          {tierLabel ? (
                            <Badge variant="secondary" className="gap-1">
                              <Tag className="h-3.5 w-3.5" />
                              {tierLabel}
                            </Badge>
                          ) : null}

                          {priceLabel ? (
                            <Badge variant="secondary" className="gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {priceLabel}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {t.suburb || t.postcode ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {[t.suburb, t.postcode].filter(Boolean).join(', ')}
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-muted-foreground">Posted by</span>
                            <Link
                              href={`/users/${t.builder_id}`}
                              className="font-medium text-foreground hover:underline"
                              title="View profile"
                            >
                              {builderName}
                            </Link>
                          </span>

                          {t.project_description ? (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span className="max-w-[720px] truncate">{t.project_description}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {isMine ? (
                          <Button variant="ghost" className="h-9 w-9 p-0" onClick={() => deleteTender(t.id)} title="Delete tender">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}

                        <Button asChild variant="outline" className="gap-2">
                          <Link href={`/tenders/${t.id}`}>
                            View Tender <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
