// @ts-nocheck
'use client';

/*
 * QA notes — ABN gating (Tender detail):
 * - /tenders list and /tenders/[id] are browseable for unverified users.
 * - Submit quote and any publish/award/accept/close/commit actions are blocked for unverified;
 *   use ABNRequiredModal and toast "Verify your ABN to continue." + link to /verify-business.
 * - No TradeGate in tenders flow.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { isPremiumForDiscovery } from '@/lib/discovery';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { safeRouterPush } from '@/lib/safe-nav';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { callTradeHubAI } from '@/lib/ai-client';
import { getVerifyBusinessUrl } from '@/lib/verification-guard';

import { AppLayout } from '@/components/app-nav';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  Info,
  ArrowLeft,
  ArrowRight,
  Send,
  Lock,
  Sparkles,
  BadgeCheck,
  Crown,
  Star,
  LayoutDashboard,
  FileText,
  Layers,
  MessageSquare,
  Settings,
  XCircle,
  Trash2,
} from 'lucide-react';

import {
  formatCurrency,
  getTierDisplayName,
  getStatusDisplayName,
  canSubmitQuote,
  getPublicQuoteStatus,
} from '@/lib/tender-utils';

import { formatDistanceToNow } from 'date-fns';
import { ABNRequiredModal } from '@/components/abn-required-modal';
import { hasValidABN } from '@/lib/abn-utils';
import { isUUID, parseTradeSuburbSlug, slugifyTrade } from '@/lib/slug-utils';
import { getTradeIcon } from '@/lib/trade-icons';
import TradeSuburbTenders from '@/components/trade-suburb-tenders';

type StoredAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
  bucket: string;
};

type TenderDoc = {
  id: string;
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
};

type TenderTradeReq = {
  id: string;
  trade: string;
  subDescription: string;
};

type TenderBuilder = {
  name?: string | null;
  businessName?: string | null;
  rating?: number | null;
  completedJobs?: number | null;
};

type TenderDetail = {
  id: string;
  builderId: string;
  projectName: string;
  projectDescription: string;
  status: string;
  tier: string;
  suburb: string;
  postcode: string;
  isNameHidden: boolean;
  isAnonymous: boolean;
  quoteRequestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;

  desiredStartDate: string | null;
  desiredEndDate: string | null;
  closesAt: string | null;
  createdAt: string;

  budgetMinCents: number | null;
  budgetMaxCents: number | null;

  quoteCapTotal: number | null;
  quoteCountTotal: number;

  builder: TenderBuilder;
  tradeRequirements: TenderTradeReq[];
  documents: TenderDoc[];
  quotes: any[];
  sharedAttachments?: StoredAttachment[];
};

const safeDate = (v: any) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * ✅ Fix: Hooks order / conditional-return problem
 * We decide whether this route is a trade/suburb landing route in a wrapper component,
 * then render a separate component for UUID tender details.
 */
export default function TenderDetailRoutePage() {
  const params = useParams();
  const raw = String((params as any)?.id ?? '');

  const parsed = useMemo(() => {
    if (!raw) return null;
    if (isUUID(raw)) return null;
    return parseTradeSuburbSlug(raw);
  }, [raw]);

  if (parsed) {
    return <TradeSuburbTenders trade={parsed.trade} suburb={parsed.suburb} />;
  }

  return <TenderDetailUuidPage id={raw} />;
}

function QuoteRequestRow({
  request,
  tenderTradeRequirements,
  supabase,
  onAccept,
  onDecline,
  onMessage,
}: {
  request: { id: string; requester_id: string; status: string; requester_name?: string; created_at: string };
  tenderTradeRequirements: TenderTradeReq[];
  supabase: ReturnType<typeof getBrowserSupabase>;
  onAccept: () => void;
  onDecline: () => void;
  onMessage: (requesterId: string) => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(tenderTradeRequirements.length === 1 ? slugifyTrade(tenderTradeRequirements[0].trade) : '');
  const trades = tenderTradeRequirements.map((t) => t.trade);

  const handleAccept = async () => {
    const tradeSlug = tenderTradeRequirements.length === 1 ? slugifyTrade(tenderTradeRequirements[0].trade) : selectedTrade;
    if (!tradeSlug) {
      toast.error('Please select a trade');
      return;
    }
    setAccepting(true);
    try {
      // TODO(email-pipeline): move accept/decline quote-request actions to a server API route
      // so post-accept transactional emails can be queued strictly server-side after commit.
      const { error } = await supabase.rpc('accept_quote_request', { p_request_id: request.id, p_trade_slug: tradeSlug });
      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('quote_trade_limit_reached')) toast.error('Requester has used their 3 quotes for this trade.');
        else toast.error('Could not accept.');
        return;
      }
      toast.success('Request accepted');
      onAccept();
      onMessage(request.requester_id);
    } catch {
      toast.error('Could not accept');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      const { error } = await supabase.rpc('decline_quote_request', { p_request_id: request.id });
      if (error) {
        toast.error('Could not decline');
        return;
      }
      toast.success('Request declined');
      onDecline();
    } catch {
      toast.error('Could not decline');
    } finally {
      setDeclining(false);
    }
  };

  const statusLabel = request.status === 'PENDING' ? 'Pending' : request.status === 'ACCEPTED' ? 'Accepted' : request.status === 'DECLINED' ? 'Declined' : request.status;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{request.requester_name ?? 'Unknown'}</p>
          <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>
          <Badge variant={request.status === 'PENDING' ? 'secondary' : 'outline'} className="mt-1">
            {statusLabel}
          </Badge>
        </div>
      </div>
      {request.status === 'PENDING' && (
        <div className="flex flex-wrap items-center gap-2">
          {trades.length > 1 ? (
            <select
              value={selectedTrade}
              onChange={(e) => setSelectedTrade(e.target.value)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="">Select trade</option>
              {trades.map((t) => (
                <option key={t} value={slugifyTrade(t)}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
          <Button size="sm" onClick={handleAccept} disabled={accepting || declining || (trades.length > 1 && !selectedTrade)}>
            {accepting ? 'Accepting…' : 'Accept'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDecline} disabled={accepting || declining}>
            {declining ? 'Declining…' : 'Decline'}
          </Button>
        </div>
      )}
      {request.status === 'ACCEPTED' && (
        <Button size="sm" variant="outline" onClick={() => onMessage(request.requester_id)}>
          Message
        </Button>
      )}
    </div>
  );
}

function TenderDetailUuidPage({ id }: { id: string }) {
  const { currentUser, isLoading } = useAuth();
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview');

  const [quotePrice, setQuotePrice] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotePermissionError, setQuotePermissionError] = useState<string | null>(null);
  const [showABNModal, setShowABNModal] = useState(false);

  const [quoteAiLoading, setQuoteAiLoading] = useState(false);
  const [quoteAiError, setQuoteAiError] = useState<string | null>(null);

  const [tender, setTender] = useState<TenderDetail | null>(null);
  const [posterUser, setPosterUser] = useState<any>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingTender, setLoadingTender] = useState(true);
  const [quoteRequests, setQuoteRequests] = useState<Array<{ id: string; requester_id: string; status: string; requester_name?: string; created_at: string }>>([]);

  const isAdminUser = isAdmin(currentUser);
  // Role used for UI/copy only, not permissions
  const isContractor = currentUser?.role === 'contractor';
  const isSubcontractor = currentUser?.role === 'subcontractor';

  const isMyTender = (t: TenderDetail) => !!currentUser && t.builderId === currentUser.id;

  const viewerTrades = useMemo(() => {
    const t = (currentUser as any)?.trades;
    if (Array.isArray(t) && t.length > 0) return t.filter((x: string) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
    const pt = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade;
    return pt ? [String(pt).trim()] : [];
  }, [currentUser]);

  const handleEditQuoteClick = () => {
    const userForDiscovery = {
      id: currentUser?.id,
      plan: (currentUser as any)?.plan ?? null,
      is_premium: currentUser?.isPremium ?? undefined,
      subscription_status: currentUser?.subscriptionStatus,
      active_plan: currentUser?.activePlan,
      subcontractor_plan: undefined,
    };
    const isPremium = isPremiumForDiscovery(userForDiscovery as Parameters<typeof isPremiumForDiscovery>[0]);

    if (!isPremium) {
      // Keep button visible for Free, but send to pricing
      toast.error('Upgrade to edit quotes', {
        description:
          "Editing tender quotes is a Premium feature. You can delete this quote, but it will still count toward your monthly quote limit.",
        duration: 5000,
      });
      router.push('/pricing');
      return;
    }

    // Premium: proceed to edit flow (if you have one). For now, show a helpful toast.
    toast('Edit quote', { description: 'Opening quote editor…' });
    // TODO: router.push(`/tenders/${tenderId}/quotes/${quoteId}/edit`)
  };

  // Fetch tender: use API (GET /api/tenders/[id]) when logged in — same view access as Find Work
  useEffect(() => {
    const run = async () => {
      if (!id || !isUUID(id)) {
        setTender(null);
        setLoadingTender(false);
        return;
      }

      try {
        setLoadingTender(true);
        setPageError(null);
        setPosterUser(null);

        let dataAny: any = null;

        if (currentUser?.id) {
          const res = await fetch(`/api/tenders/${id}`);
          if (res.ok) {
            const json = await res.json();
            if (json && json.id) dataAny = json;
          }
        }

        if (!dataAny && currentUser?.id) {
          const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('get_tender_for_viewer', {
            p_tender_id: id,
            p_viewer_id: currentUser.id,
          });
          if (!rpcErr) {
            const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            if (row) {
              const { data: trData } = await supabase
                .from('tender_trade_requirements')
                .select('id,trade,sub_description')
                .eq('tender_id', id);
              dataAny = { ...row, tradeRequirements: trData ?? [] };
            }
          }
        }

        if (!dataAny) {
          const { data, error } = await supabase
            .from('tenders')
            .select(
              `
              *,
              tradeRequirements:tender_trade_requirements(*),
              shared_attachments
            `
            )
            .eq('id', id)
            .is('deleted_at', null)
            .maybeSingle();
          if (error) throw error;
          dataAny = data;
        }

        if (!dataAny) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[tender detail]', {
              viewerId: currentUser?.id,
              tenderId: id,
              isOwner: false,
              isAdmin: isAdminUser,
              source: 'none',
              canView: false,
            });
          }
          setTender(null);
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          const isOwner = dataAny.builder_id === currentUser?.id;
          console.log('[tender detail] loaded', {
            viewerId: currentUser?.id,
            tenderId: id,
            isOwner,
            isAdmin: isAdminUser,
            canView: true,
          });
        }

        const mapped: TenderDetail = {
          id: dataAny.id,
          builderId: dataAny.builder_id,
          projectName: dataAny.project_name,
          projectDescription: dataAny.project_description || '',
          status: dataAny.status,
          tier: dataAny.tier,
          suburb: dataAny.suburb || '',
          postcode: dataAny.postcode || '',
          isNameHidden: !!dataAny.is_name_hidden,
          isAnonymous: !!dataAny.is_anonymous,

          desiredStartDate: dataAny.desired_start_date,
          desiredEndDate: dataAny.desired_end_date,
          closesAt: dataAny.closes_at,
          createdAt: dataAny.created_at ?? '',

          budgetMinCents: dataAny.budget_min_cents ?? null,
          budgetMaxCents: dataAny.budget_max_cents ?? null,

          quoteCapTotal: dataAny.quote_cap_total ?? null,
          quoteCountTotal: dataAny.quote_count_total ?? 0,

          builder: {
            name: null,
            businessName: null,
            rating: null,
            completedJobs: null,
          },

          tradeRequirements:
            dataAny.tradeRequirements?.map((tr: any) => ({
              id: tr.id,
              trade: tr.trade,
              subDescription: tr.sub_description || '',
            })) || [],

          documents: [],
          quotes: [],
          sharedAttachments: (dataAny.shared_attachments ?? []) as StoredAttachment[],
        };

        setTender(mapped);

        if (!mapped.isAnonymous && mapped.builderId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id,name,business_name,avatar,rating,abn_status,abn_verified_at,is_premium,subscription_status')
            .eq('id', mapped.builderId)
            .maybeSingle();
          if (userData) {
            setPosterUser(userData);
          }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: reqData } = await supabase
            .from('tender_quote_requests')
            .select('status')
            .eq('tender_id', id)
            .eq('requester_id', user.id)
            .maybeSingle();
          if (reqData) {
            setTender((prev) => prev ? { ...prev, quoteRequestStatus: (reqData as any).status } : prev);
          }
        }
      } catch (e: any) {
        console.error(e);
        setPageError(e?.message || 'Failed to load tender');
      } finally {
        setLoadingTender(false);
      }
    };

    run();
  }, [id, supabase, currentUser?.id]);

  // Fetch quote requests for tender owner (poster)
  useEffect(() => {
    if (!tender || !currentUser?.id || tender.builderId !== currentUser.id) return;
    let cancelled = false;
    (async () => {
      const { data: reqs } = await supabase
        .from('tender_quote_requests')
        .select('id, requester_id, status, created_at')
        .eq('tender_id', tender.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const list = (reqs ?? []) as { id: string; requester_id: string; status: string; created_at: string }[];
      if (list.length === 0) {
        setQuoteRequests([]);
        return;
      }
      const { data: users } = await supabase
        .from('users')
        .select('id, name, business_name')
        .in('id', list.map((r) => r.requester_id));
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      setQuoteRequests(
        list.map((r) => ({
          ...r,
          requester_name: (userMap.get(r.requester_id) as any)?.business_name ?? (userMap.get(r.requester_id) as any)?.name ?? 'Unknown',
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [tender?.id, tender?.builderId, currentUser?.id, supabase]);

  async function onViewAttachment(file: StoredAttachment | { path?: string; bucket?: string; url?: string; name?: string; type?: string }) {
    try {
      if (file?.url && typeof file.url === 'string') {
        window.open(file.url, '_blank', 'noreferrer');
        return;
      }

      const bucket = file?.bucket ?? 'tender-attachments';
      const path = file?.path;

      if (!path) {
        toast.error('Missing file path.');
        return;
      }

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
      if (error) throw error;

      const url = data?.signedUrl;
      if (!url) {
        toast.error('Could not open file.');
        return;
      }

      window.open(url, '_blank', 'noreferrer');
    } catch (e) {
      console.error('[tenders] view attachment failed', e);
      toast.error('Could not open file.');
    }
  }

  if (isLoading || loadingTender) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (pageError) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <Link href="/tenders" className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Tenders
            </Link>
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Couldn’t load this tender</h2>
              <p className="text-sm text-gray-600">{pageError}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!tender) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <Link href="/tenders" className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Tenders
            </Link>
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Tender not found</h2>
              <p className="text-sm text-gray-600">This tender may have been removed or you don’t have access.</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Public (not logged in) view:
  if (!currentUser) {
    const quoteStatus = getPublicQuoteStatus(tender.status, tender.quoteCapTotal ?? null, tender.quoteCountTotal);

    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <Link href="/tenders" className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Tenders
            </Link>

            <Card className="mb-6">
              <CardHeader>
                <div className="mb-4 flex items-start justify-between">
                  <Badge className={quoteStatus.color}>{quoteStatus.label}</Badge>
                </div>
                <CardTitle className="pointer-events-none select-none text-2xl blur-sm">Project Details Hidden</CardTitle>
                <p className="pointer-events-none select-none text-sm text-gray-500 blur-sm">
                  Full description available after sign in
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Location</h3>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>
                      {tender.suburb}, {tender.postcode}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Posted</h3>
                  <div className="flex items-center text-gray-600">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>{formatDistanceToNow(new Date(tender.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {tender.tradeRequirements?.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-700">Required Trades</h3>
                    <div className="space-y-1.5">
                      {tender.tradeRequirements.map((req) => {
                        const Icon = getTradeIcon(req.trade);
                        return (
                          <div key={req.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                            <span>{req.trade}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="-mx-6 rounded-lg border-t border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="mb-4 flex items-start space-x-3">
                    <Lock className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-900">Sign in to access:</h4>
                      <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                        <li>Full project description & scope</li>
                        <li>Budget range & timeline details</li>
                        <li>Project documents & plans</li>
                        <li>Builder information</li>
                        <li>Submit your quote</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={() => safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login')}
                  >
                    Sign in to view & quote
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => safeRouterPush(router, `/signup?returnUrl=/tenders/${tender.id}`, '/signup')}
                  >
                    Create account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Access gating: viewer must match trade (unless admin / owner)
  const tradeMatchesTender = (t: TenderDetail) => {
    if (!t.tradeRequirements || t.tradeRequirements.length === 0) return false;
    return t.tradeRequirements.some((req) => viewerTrades.includes(req.trade));
  };

  const viewerTradeRequirement = tender.tradeRequirements?.find((req) => viewerTrades.includes(req.trade));

  if (!isMyTender(tender) && !isAdminUser && !tender.isAnonymous && !tradeMatchesTender(tender)) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <Link href="/tenders" className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Tenders
            </Link>
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h2 className="mb-2 text-xl font-semibold text-gray-900">This tender isn’t available for your trade.</h2>
              <p className="mb-6 text-gray-600">
                TradeHub only shows tenders that match your primary trade to keep listings relevant.
              </p>
              <Button variant="outline" onClick={() => router.push('/tenders')}>
                ← Back to Tenders
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const hasLimitedQuotes = tender.quoteCapTotal !== null && tender.quoteCapTotal > 0;
  const canSubmitUnderCap = canSubmitQuote(tender.quoteCapTotal, tender.quoteCountTotal);

  // If you’re using “limited quotes” as “contractors only”, enforce that here.
  const blockedByLimitedQuotes = hasLimitedQuotes && isSubcontractor;

  // Trade scope visibility: free users see only their matched trade(s); owner/admin/premium see all
  const userForDiscovery = currentUser
    ? {
        plan: (currentUser as any).plan ?? null,
        is_premium: (currentUser as any).isPremium ?? (currentUser as any).is_premium ?? undefined,
        subscription_status: (currentUser as any).subscriptionStatus ?? (currentUser as any).subscription_status ?? null,
        active_plan: (currentUser as any).activePlan ?? (currentUser as any).active_plan ?? null,
        subcontractor_plan: undefined,
        subcontractor_sub_status: undefined,
      }
    : null;
  const isPremiumUser = isPremiumForDiscovery(userForDiscovery as Parameters<typeof isPremiumForDiscovery>[0]);
  const isOwnerOrAdmin = isMyTender(tender) || isAdminUser;
  const visibleTradeRequirements =
    isOwnerOrAdmin || isPremiumUser
      ? tender.tradeRequirements ?? []
      : (tender.tradeRequirements ?? []).filter((req) => viewerTrades.includes(req.trade));

  const canQuote =
    tender.status === 'LIVE' &&
    canSubmitUnderCap &&
    !blockedByLimitedQuotes &&
    ((tender.quoteRequestStatus === 'ACCEPTED') || !isContractor);

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const canViewTender = true;
    const debug = {
      viewerId: currentUser?.id,
      tenderId: tender.id,
      isOwner: isMyTender(tender),
      isAdmin: isAdminUser,
      discoverable: !isMyTender(tender) && !isAdminUser && (tradeMatchesTender(tender) || tender.isAnonymous),
      quoteRequestStatus: tender.quoteRequestStatus,
      canViewTender,
      canQuoteTender: canQuote,
    };
    (window as any).__tenderDetailDebug = debug;
    console.log('[tender detail] canView/canQuote', debug);
  }

  const handleWriteQuoteWithAI = async () => {
    setQuoteAiError(null);
    setQuoteAiLoading(true);
    try {
      const message = await callTradeHubAI({
        userId: currentUser.id,
        mode: 'quote_helper',
        messages: [
          {
            role: 'user',
            content:
              'Write a quote message template for this tender. Use placeholders, do not invent exact prices.',
          },
        ],
        context: {
          role: 'subcontractor',
          tender: {
            id: tender.id,
            title: tender.projectName,
            description: tender.projectDescription,
            requiredTrades: tender.tradeRequirements?.map((r) => r.trade) || [],
            suburb: tender.suburb,
            postcode: tender.postcode,
            dates: { start: tender.desiredStartDate, end: tender.desiredEndDate },
          },
          subcontractor: { primaryTrade: currentUser.primaryTrade, name: currentUser.name },
        },
      });

      setQuoteNotes(message.content);
    } catch (e: any) {
      setQuoteAiError(e?.message || 'AI quote helper failed');
    } finally {
      setQuoteAiLoading(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!hasValidABN(currentUser)) {
      toast.error('Verify your ABN to continue.');
      setShowABNModal(true);
      return;
    }

    if (!tender.id || !currentUser.primaryTrade) {
      toast.error('Missing tender details');
      return;
    }

    const n = Number(quotePrice);
    if (!quotePrice || Number.isNaN(n) || n <= 0) {
      toast.error('Please enter a valid quote amount');
      return;
    }

    setIsSubmitting(true);
    setQuotePermissionError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login');
        return;
      }

      const priceCents = Math.round(n * 100);
      const { error } = await supabase.rpc('tender_submit_quote', {
        p_tender_id: tender.id,
        p_trade_key: currentUser.primaryTrade,
        p_price_cents: priceCents,
        p_notes: quoteNotes?.trim() || null,
      });

      if (error) throw error;

      toast.success('Quote submitted successfully');
      setQuotePrice('');
      setQuoteNotes('');
      router.refresh();
    } catch (err: any) {
      console.error('[tender] quote submit failed', err);
      const msg = err.message || 'Failed to submit quote';
      setQuotePermissionError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Fix: avoid broken role dashboards — keep this stable
  const dashboardHref = '/dashboard';

  const startDate = safeDate(tender.desiredStartDate);
  const endDate = safeDate(tender.desiredEndDate);
  const closesAt = safeDate(tender.closesAt);

  const hasDocs = Array.isArray(tender.sharedAttachments) && tender.sharedAttachments.length > 0;
  const ProjectFilesBlock = (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Project files</h3>

      {hasDocs ? (
        <div className="space-y-2">
          {tender.sharedAttachments!.map((file: StoredAttachment, idx: number) => (
            <div
              key={file?.path ?? idx}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">
                  {file?.name ?? file?.path?.split('/')?.pop() ?? 'Attachment'}
                </div>
                <div className="text-xs text-slate-500">
                  {file?.type ? String(file.type) : 'File'}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewAttachment(file)}
              >
                View
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-sm text-slate-600">
          No documents attached
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-50 via-white to-blue-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        <div className="pointer-events-none absolute -right-[520px] -bottom-[520px] opacity-[0.06]">
          <img src="/TradeHub-Mark-blackout.svg" alt="" className="h-[1600px] w-[1600px]" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto">
            <div className="mb-4">
              <Link
                href="/tenders"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Tenders
              </Link>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white p-6">
              {/* Header row inside the big card */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{tender.projectName}</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Tender • {getStatusDisplayName(tender.status)} • {tender.suburb} {tender.postcode ? `VIC ${tender.postcode}` : ''}
                  </p>
                </div>
                <div className="shrink-0">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Primary action strip */}
              <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-white px-5 py-3 shadow-sm">
                {isMyTender(tender) ? (
                  <>
                    <Button size="sm" className="gap-1.5 bg-blue-600 text-white shadow-sm hover:bg-blue-700">
                      <Settings className="h-3.5 w-3.5" />
                      Manage tender
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-slate-300">
                      <XCircle className="h-3.5 w-3.5" />
                      Close
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    {isContractor && tender.quoteRequestStatus !== 'ACCEPTED' ? (
                      <>
                        <Button size="sm" variant="outline" asChild className="gap-1.5">
                          <a href="#posted-by">Request to quote</a>
                        </Button>
                        <span className="text-xs text-slate-600">
                          {tender.isAnonymous
                            ? 'You can view this tender now. Pricing and contact unlock after your request is accepted.'
                            : 'Request to quote — the poster can accept or decline.'}
                        </span>
                      </>
                    ) : null}
                    {canQuote ? (
                      <Button
                        size="sm"
                        onClick={() => setActiveTab('quotes')}
                        className="gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Submit quote
                      </Button>
                    ) : null}
                  </>
                )}
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="mt-5">
                  <TabsList className="grid w-full grid-cols-4 h-9 gap-0.5 rounded-lg bg-slate-100 p-1">
                    <TabsTrigger
                      value="overview"
                      className="rounded-md text-slate-600 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="documents"
                      className="rounded-md text-slate-600 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger
                      value="scope"
                      className="rounded-md text-slate-600 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
                    >
                      <Layers className="h-3.5 w-3.5 mr-1.5" />
                      Scope
                    </TabsTrigger>
                    <TabsTrigger
                      value="quotes"
                      className="rounded-md text-slate-600 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Quotes {isContractor && `(${tender.quotes?.length || 0})`}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Main layout inside the single card */}
                <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Left: tab content */}
                  <div className="lg:col-span-2">
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-6">
                      <TabsContent value="overview" className="mt-0">
                        <div className="space-y-6">
                          <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Project Description</h3>
                            <p className="text-sm text-slate-700 leading-7">{tender.projectDescription}</p>
                          </section>

                          {!isContractor && viewerTradeRequirement && (
                            <section className="border-t border-slate-200 pt-5">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                Your trade details ({viewerTradeRequirement.trade})
                              </h3>
                              <p className="text-sm text-slate-700 leading-relaxed">{viewerTradeRequirement.subDescription}</p>
                            </section>
                          )}

                          {visibleTradeRequirements.length > 0 && (
                            <section className="border-t border-slate-200 pt-5">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                                {isOwnerOrAdmin || isPremiumUser ? 'Required Trades' : 'Your trade requirement'}
                              </h3>
                              <div className="space-y-1.5">
                                {visibleTradeRequirements.map((req) => {
                                  const Icon = getTradeIcon(req.trade);
                                  return (
                                    <div
                                      key={req.id}
                                      className="flex items-center gap-2 text-sm text-slate-700"
                                    >
                                      <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                                      <span>{req.trade}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          )}

                          <section className="border-t border-slate-200 pt-5">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Timeline</h3>
                            <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
                              {startDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-500" />
                                  <span>Starts: {startDate.toLocaleDateString('en-AU')}</span>
                                </div>
                              )}
                              {endDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-500" />
                                  <span>Ends: {endDate.toLocaleDateString('en-AU')}</span>
                                </div>
                              )}
                              {closesAt && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-slate-500" />
                                  <span>Closes: {closesAt.toLocaleDateString('en-AU')}</span>
                                </div>
                              )}
                            </div>
                          </section>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="mt-0">
                        {ProjectFilesBlock}
                      </TabsContent>

                      <TabsContent value="scope" className="mt-0">
                        <div className="space-y-6">
                          <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Project Description</h3>
                            <p className="text-sm text-slate-700 leading-7">{tender.projectDescription}</p>
                          </section>

                          {!isContractor && viewerTradeRequirement && (
                            <section className="border-t border-slate-200 pt-5">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                Your trade details ({viewerTradeRequirement.trade})
                              </h3>
                              <p className="text-sm text-slate-700 leading-relaxed">{viewerTradeRequirement.subDescription}</p>
                            </section>
                          )}

                          {visibleTradeRequirements.length > 0 && (
                            <section className="border-t border-slate-200 pt-5">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                                {isOwnerOrAdmin || isPremiumUser ? 'All Trade Requirements' : 'Your matched trade scope'}
                              </h3>
                              <div className="space-y-4">
                                {visibleTradeRequirements.map((req) => {
                                  const Icon = getTradeIcon(req.trade);
                                  return (
                                    <div key={req.id} className="border-l-4 border-blue-500 pl-4">
                                      <h4 className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                                        {req.trade}
                                      </h4>
                                      <p className="text-sm text-slate-700 leading-relaxed">{req.subDescription}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="quotes" className="mt-0">
                        {isMyTender(tender) ? (
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900">Quote requests</h3>
                            {quoteRequests.length === 0 ? (
                              <div className="py-12 text-center">
                                <Users className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                                <p className="text-gray-600">No quote requests yet. When someone requests to quote, they&apos;ll appear here.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {quoteRequests.map((req) => (
                                  <QuoteRequestRow
                                    key={req.id}
                                    request={req}
                                    tenderTradeRequirements={tender.tradeRequirements ?? []}
                                    supabase={supabase}
                                    onAccept={() => {
                                      setQuoteRequests((prev) => prev.filter((r) => r.id !== req.id));
                                    }}
                                    onDecline={() => {
                                      setQuoteRequests((prev) => prev.filter((r) => r.id !== req.id));
                                    }}
                                    onMessage={(requesterId) => router.push(`/messages?userId=${requesterId}`)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                        {!canQuote ? (
                          <Alert
                            variant={isContractor && tender.quoteRequestStatus !== 'ACCEPTED' ? 'default' : 'destructive'}
                            className={isContractor && tender.quoteRequestStatus !== 'ACCEPTED' ? 'border-blue-200 bg-blue-50' : ''}
                          >
                            {isContractor && tender.quoteRequestStatus !== 'ACCEPTED' ? (
                              <Info className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertDescription>
                              {isContractor && (tender.quoteRequestStatus === 'PENDING' || !tender.quoteRequestStatus)
                                ? tender.isAnonymous
                                  ? 'You can view this tender now. Pricing and contact unlock after your request is accepted.'
                                  : 'Request to quote — the poster can accept or decline.'
                                : tender.quoteRequestStatus === 'DECLINED'
                                  ? 'Your request to quote was declined.'
                                  : blockedByLimitedQuotes
                                    ? 'This tender has limited quotes enabled. Only registered contractors (not subcontractors) can submit quotes for this tender.'
                                    : 'This tender has reached its quote limit and is no longer accepting submissions.'}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {quotePermissionError ? (
                              <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-900">{quotePermissionError}</AlertDescription>
                              </Alert>
                            ) : (
                              <Alert className="border-blue-200 bg-blue-50">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-900">
                                  Submit your quote to be considered for this project. The builder will review all quotes and may contact you for more details.
                                </AlertDescription>
                              </Alert>
                            )}

                            <div>
                              <Label htmlFor="quotePrice">Your Quote (AUD)</Label>
                              <Input
                                id="quotePrice"
                                type="number"
                                value={quotePrice}
                                onChange={(e) => setQuotePrice(e.target.value)}
                                placeholder="e.g., 65000"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor="quoteNotes">Additional Notes (Optional)</Label>
                              <Textarea
                                id="quoteNotes"
                                value={quoteNotes}
                                onChange={(e) => setQuoteNotes(e.target.value)}
                                placeholder="Add any relevant details about your quote, availability, or experience..."
                                rows={4}
                                className="mt-1"
                              />

                              <div className="mt-2 flex items-start gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleWriteQuoteWithAI}
                                  disabled={quoteAiLoading}
                                  className="flex items-center gap-1"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  {quoteAiLoading ? 'Writing…' : 'Write with AI'}
                                </Button>
                                {quoteAiError && <p className="flex-1 text-sm text-red-600">{quoteAiError}</p>}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handleSubmitQuote} disabled={isSubmitting || !quotePrice} className="flex-1">
                                <Send className="mr-2 h-4 w-4" />
                                {isSubmitting ? 'Submitting…' : 'Submit Quote'}
                              </Button>
                              {/* Edit Quote (blocked) */}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleEditQuoteClick}
                              >
                                Edit quote
                              </Button>
                            </div>
                          </div>
                        )}
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </div>

                  {/* Right: Tender Summary sidebar */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Tender Summary</h3>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Location</div>
                        <div className="flex items-start gap-2 text-sm text-slate-700">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                          <span>{tender.suburb}{tender.postcode ? ` VIC ${tender.postcode}` : ''}</span>
                        </div>
                        <Alert className="mt-2 border-blue-200 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-xs text-blue-900">
                            Exact address shared after quote acceptance
                          </AlertDescription>
                        </Alert>
                      </div>

                      {startDate && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Starts</div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            {startDate.toLocaleDateString('en-AU')}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                          {isOwnerOrAdmin || isPremiumUser ? 'Required trades' : 'Your matched trades'}
                        </div>
                        <div className="text-sm font-medium text-slate-700">{visibleTradeRequirements.length}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Documents</div>
                        <div className="text-sm font-medium text-slate-700">{tender.sharedAttachments?.length ?? 0}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Quotes</div>
                        <div className="text-sm font-medium text-slate-700">{tender.quoteCountTotal ?? 0}{tender.quoteCapTotal ? ` / ${tender.quoteCapTotal}` : ''}</div>
                      </div>

                      {(tender.budgetMinCents || tender.budgetMaxCents) && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Budget</div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <DollarSign className="h-4 w-4 text-slate-500" />
                            {tender.budgetMinCents ? formatCurrency(tender.budgetMinCents) : '—'}{' '}
                            {tender.budgetMaxCents ? `– ${formatCurrency(tender.budgetMaxCents)}` : ''}
                          </div>
                        </div>
                      )}

                      <div id="posted-by" className="border-t border-slate-200 pt-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Posted by</div>
                        {tender.isAnonymous ? (
                  isMyTender(tender) ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">Posted anonymously</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Other users won&apos;t see your profile until you accept a quote request.
                      </div>
                    </div>
                  ) : (
                    <RequestToQuote
                      tenderId={tender.id}
                      quoteRequestStatus={tender.quoteRequestStatus}
                      isAnonymous={true}
                      onRequestSent={() => setTender((prev) => prev ? { ...prev, quoteRequestStatus: 'PENDING' as const } : prev)}
                    />
                  )
                ) : posterUser ? (
                  <div className="space-y-3">
                    <Link href={`/users/${posterUser.id}`} className="block group">
                      <div
                        className={[
                          'relative flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all duration-200',
                          'hover:bg-slate-100 hover:border-slate-300',
                          (posterUser as any)?.is_premium || (posterUser as any)?.subscription_status === 'active'
                            ? 'ring-1 ring-amber-300/50'
                            : '',
                        ].join(' ')}
                      >
                        {((posterUser as any)?.is_premium || (posterUser as any)?.subscription_status === 'active') && (
                          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            <Crown className="h-3 w-3 text-amber-700" />
                          </div>
                        )}

                        <UserAvatar
                          avatarUrl={(posterUser as any)?.avatar ?? (posterUser as any)?.avatar_url}
                          userName={(posterUser as any)?.name || 'TradeHub user'}
                          size="md"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {(posterUser as any)?.name || 'TradeHub user'}
                            </p>
                            {hasValidABN(posterUser) && (
                              <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                            )}
                          </div>
                          {(posterUser as any)?.business_name && (
                            <p className="truncate text-xs text-slate-600">{(posterUser as any)?.business_name}</p>
                          )}
                          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700">
                            View profile
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </Link>
                    {!isMyTender(tender) && tender.quoteRequestStatus !== 'ACCEPTED' ? (
                      <RequestToQuote
                        tenderId={tender.id}
                        quoteRequestStatus={tender.quoteRequestStatus}
                        isAnonymous={false}
                        onRequestSent={() => setTender((prev) => prev ? { ...prev, quoteRequestStatus: 'PENDING' as const } : prev)}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    {tender.isNameHidden ? 'Business name hidden' : tender.builder.businessName || tender.builder.name || 'Builder'}
                  </div>
                )}
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <ABNRequiredModal open={showABNModal} onOpenChange={setShowABNModal} returnUrl={`/tenders/${id}`} />
    </AppLayout>
  );
}

function RequestToQuote({
  tenderId,
  quoteRequestStatus,
  isAnonymous,
  onRequestSent,
}: {
  tenderId: string;
  quoteRequestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
  isAnonymous: boolean;
  onRequestSent?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function request() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/request-quote`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Could not send request.');
        return;
      }

      setSent(true);
      onRequestSent?.();
      toast.success('Request sent');
    } finally {
      setLoading(false);
    }
  }

  const isAccepted = quoteRequestStatus === 'ACCEPTED';
  const isPending = sent || quoteRequestStatus === 'PENDING';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-sm font-semibold text-slate-900">Request to quote</div>
      <div className="mt-0.5 text-xs text-slate-500">
        {isAnonymous
          ? 'The poster is anonymous. Request access to quote — they can accept or decline.'
          : 'Request to quote on this tender — the poster can accept or decline.'}
      </div>

      <div className="mt-2">
        {isAccepted ? (
          <Button asChild size="sm" className="h-8">
            <Link href="#quotes">Submit quote</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={request}
            disabled={loading || isPending}
            className="h-8"
          >
            {isPending ? 'Request sent' : loading ? 'Sending…' : 'Request'}
          </Button>
        )}
      </div>
    </div>
  );
}
