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
import { isUUID, parseTradeSuburbSlug } from '@/lib/slug-utils';
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

  const isAdminUser = isAdmin(currentUser);
  // Role used for UI/copy only, not permissions
  const isContractor = currentUser?.role === 'contractor';
  const isSubcontractor = currentUser?.role === 'subcontractor';

  const isMyTender = (t: TenderDetail) => !!currentUser && t.builderId === currentUser.id;

  const handleEditQuoteClick = () => {
    const userForDiscovery = {
      id: currentUser?.id,
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

  // Fetch tender from Supabase
  useEffect(() => {
    const run = async () => {
      // If this isn't a UUID and also isn't a valid slug (handled in wrapper), show not found
      if (!id || !isUUID(id)) {
        setTender(null);
        setLoadingTender(false);
        return;
      }

      try {
        setLoadingTender(true);
        setPageError(null);
        setPosterUser(null);

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

        if (!data) {
          setTender(null);
          return;
        }

        const dataAny = data as any;

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

        if (mapped.isAnonymous) {
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
        }
      } catch (e: any) {
        console.error(e);
        setPageError(e?.message || 'Failed to load tender');
      } finally {
        setLoadingTender(false);
      }
    };

    run();
  }, [id, supabase]);

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
    const tradesList = tender.tradeRequirements?.map((req) => req.trade).join(', ') || '';
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

                {tradesList && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-700">Required Trades</h3>
                    <p className="font-medium text-gray-700">{tradesList}</p>
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

  // Access gating: subcontractor must match trade (unless admin / owner)
  const tradeMatchesTender = (t: TenderDetail) => {
    if (!t.tradeRequirements || t.tradeRequirements.length === 0) return false;
    return t.tradeRequirements.some((req) => req.trade === currentUser.primaryTrade);
  };

  const viewerTradeRequirement = tender.tradeRequirements?.find((req) => req.trade === currentUser.primaryTrade);

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

  const canQuote =
    tender.status === 'LIVE' &&
    canSubmitUnderCap &&
    !blockedByLimitedQuotes &&
    ((tender.isAnonymous && tender.quoteRequestStatus === 'ACCEPTED') || !isContractor);

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
                    {tender.isAnonymous && tender.quoteRequestStatus !== 'ACCEPTED' ? (
                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                        <a href="#posted-by">Request to quote</a>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => setActiveTab('quotes')}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit quote
                    </Button>
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

                          {tender.tradeRequirements?.length > 0 && (
                            <section className="border-t border-slate-200 pt-5">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Required Trades</h3>
                              <div className="space-y-1.5">
                                {tender.tradeRequirements.map((req) => {
                                  const Icon = getTradeIcon(req.trade);
                                  return (
                                    <div
                                      key={req.id}
                                      className="flex items-center gap-2 text-sm text-slate-700"
                                    >
                                      {Icon && <Icon className="h-4 w-4 text-slate-500" />}
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

                          {tender.tradeRequirements?.length > 0 && (
                            <section className="border-t border-slate-200 pt-5">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">All Trade Requirements</h3>
                              <div className="space-y-4">
                                {tender.tradeRequirements.map((req) => (
                                  <div key={req.id} className="border-l-4 border-blue-500 pl-4">
                                    <h4 className="mb-1 text-sm font-medium text-slate-900">{req.trade}</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed">{req.subDescription}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="quotes" className="mt-0">
                        {isContractor ? (
                          <div className="py-12 text-center">
                            <Users className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                            <p className="text-gray-600">Quotes view will appear here once quotes are wired.</p>
                          </div>
                        ) : (
                          <div>
                        {!canQuote ? (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {blockedByLimitedQuotes
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
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Required trades</div>
                        <div className="text-sm font-medium text-slate-700">{tender.tradeRequirements?.length ?? 0}</div>
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
                    <AnonymousRequestToQuote
                      tenderId={tender.id}
                      quoteRequestStatus={tender.quoteRequestStatus}
                      onRequestSent={() => setTender((prev) => prev ? { ...prev, quoteRequestStatus: 'PENDING' as const } : prev)}
                    />
                  )
                ) : posterUser ? (
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
                          {String((posterUser as any)?.abn_status ?? '').toUpperCase() === 'VERIFIED' && (
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

function AnonymousRequestToQuote({
  tenderId,
  quoteRequestStatus,
  onRequestSent,
}: {
  tenderId: string;
  quoteRequestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
  onRequestSent?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function request() {
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.rpc('request_to_quote', { p_tender_id: tenderId });

      if (error) {
        const msg = String((error as any)?.message || '');
        if (msg.includes('tender_not_anonymous')) toast.error('This tender is not anonymous.');
        else toast.error('Could not send request.');
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
        The poster is anonymous. Request access to quote — they can accept or decline.
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
