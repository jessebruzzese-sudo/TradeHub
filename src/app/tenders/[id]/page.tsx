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

import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';
import { safeRouterPush } from '@/lib/safe-nav';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { callTradeHubAI } from '@/lib/ai-client';
import { getVerifyBusinessUrl } from '@/lib/verification-guard';

import { AppLayout } from '@/components/app-nav';
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
  FileText,
  Users,
  Clock,
  AlertCircle,
  Info,
  ArrowLeft,
  Send,
  Lock,
  Sparkles,
} from 'lucide-react';

import {
  formatCurrency,
  getTierBadgeColor,
  getTierDisplayName,
  getStatusBadgeColor,
  getStatusDisplayName,
  canSubmitQuote,
  getPublicQuoteStatus,
} from '@/lib/tender-utils';

import { formatDistanceToNow } from 'date-fns';
import { ABNRequiredModal } from '@/components/abn-required-modal';
import { hasValidABN } from '@/lib/abn-utils';
import { isUUID, parseTradeSuburbSlug } from '@/lib/slug-utils';
import TradeSuburbTenders from '@/components/trade-suburb-tenders';
import { checkQuoteSubmissionPermission } from '@/lib/permission-utils';

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
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingTender, setLoadingTender] = useState(true);

  const isAdminUser = isAdmin(currentUser);
  // Role used for UI/copy only, not permissions
  const isContractor = currentUser?.role === 'contractor';
  const isSubcontractor = currentUser?.role === 'subcontractor';

  const isMyTender = (t: TenderDetail) => !!currentUser && t.builderId === currentUser.id;

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

        const { data, error } = await supabase
          .from('tenders')
          .select(
            `
            *,
            tradeRequirements:tender_trade_requirements(*)
          `
          )
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setTender(null);
          return;
        }

        const mapped: TenderDetail = {
          id: data.id,
          builderId: data.builder_id,
          projectName: data.project_name,
          projectDescription: data.project_description || '',
          status: data.status,
          tier: data.tier,
          suburb: data.suburb || '',
          postcode: data.postcode || '',
          isNameHidden: !!data.is_name_hidden,

          desiredStartDate: data.desired_start_date,
          desiredEndDate: data.desired_end_date,
          closesAt: data.closes_at,
          createdAt: data.created_at ?? '',

          budgetMinCents: data.budget_min_cents ?? null,
          budgetMaxCents: data.budget_max_cents ?? null,

          quoteCapTotal: data.quote_cap_total ?? null,
          quoteCountTotal: data.quote_count_total ?? 0,

          builder: {
            name: null,
            businessName: null,
            rating: null,
            completedJobs: null,
          },

          tradeRequirements:
            data.tradeRequirements?.map((tr: any) => ({
              id: tr.id,
              trade: tr.trade,
              subDescription: tr.sub_description || '',
            })) || [],

          documents: [],
          quotes: [],
        };

        setTender(mapped);
      } catch (e: any) {
        console.error(e);
        setPageError(e?.message || 'Failed to load tender');
      } finally {
        setLoadingTender(false);
      }
    };

    run();
  }, [id, supabase]);

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

  if (!isMyTender(tender) && !isAdminUser && !tradeMatchesTender(tender)) {
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
    !isContractor && tender.status === 'LIVE' && canSubmitUnderCap && !blockedByLimitedQuotes;

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

    const n = Number(quotePrice);
    if (!quotePrice || Number.isNaN(n) || n <= 0) {
      alert('Please enter a valid quote amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setQuotePermissionError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login');
        return;
      }

      const permission = await checkQuoteSubmissionPermission(session.access_token, tender.id);

      if (!permission.canSubmit) {
        setQuotePermissionError(permission.message || permission.reason || 'You cannot submit a quote.');
        return;
      }

      // TODO: insert into quotes table when you wire it.
      console.warn('[ABN WRITE ATTEMPT]', 'quotes (demo)', { tenderId: tender.id }); // ABN_QA_ONLY
      setTimeout(() => {
        alert('Quote submitted successfully! (demo)');
        setQuotePrice('');
        setQuoteNotes('');
        setIsSubmitting(false);
      }, 600);
    } catch (e) {
      console.error('Error submitting quote:', e);
      setQuotePermissionError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ✅ Fix: avoid broken role dashboards — keep this stable
  const dashboardHref = '/dashboard';

  const startDate = safeDate(tender.desiredStartDate);
  const endDate = safeDate(tender.desiredEndDate);
  const closesAt = safeDate(tender.closesAt);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href={dashboardHref} className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-2">
                      <Badge className={getTierBadgeColor(tender.tier)}>{getTierDisplayName(tender.tier)}</Badge>
                      <Badge className={getStatusBadgeColor(tender.status)}>{getStatusDisplayName(tender.status)}</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{tender.projectName}</CardTitle>
                </CardHeader>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="scope">Scope</TabsTrigger>
                  <TabsTrigger value="quotes">Quotes {isContractor && `(${tender.quotes?.length || 0})`}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <h3 className="mb-2 font-semibold text-gray-900">Project Description</h3>
                        <p className="text-gray-600">{tender.projectDescription}</p>
                      </div>

                      {!isContractor && viewerTradeRequirement && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="mb-2 font-semibold text-gray-900">
                            Your trade details ({viewerTradeRequirement.trade})
                          </h3>
                          <p className="text-gray-600">{viewerTradeRequirement.subDescription}</p>
                        </div>
                      )}

                      {tender.tradeRequirements?.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="mb-3 font-semibold text-gray-900">Required Trades</h3>
                          <div className="flex flex-wrap gap-2">
                            {tender.tradeRequirements.map((req) => (
                              <Badge key={req.id} variant="outline">
                                {req.trade}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="mb-3 font-semibold text-gray-900">Timeline</h3>
                        <div className="space-y-2">
                          {startDate && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>Starts: {startDate.toLocaleDateString('en-AU')}</span>
                            </div>
                          )}
                          {endDate && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>Ends: {endDate.toLocaleDateString('en-AU')}</span>
                            </div>
                          )}
                          {closesAt && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Closes: {closesAt.toLocaleDateString('en-AU')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                  <Card>
                    <CardContent className="pt-6">
                      {tender.documents.length === 0 ? (
                        <div className="py-8 text-center">
                          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                          <p className="text-gray-600">No documents attached</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tender.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-center">
                                <FileText className="mr-3 h-5 w-5 text-gray-400" />
                                <div>
                                  <div className="font-medium text-gray-900">{doc.fileName}</div>
                                  <div className="text-sm text-gray-500">
                                    {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.fileUrl} download>
                                  Download
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="scope" className="mt-6">
                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <h3 className="mb-2 font-semibold text-gray-900">Project Description</h3>
                        <p className="text-gray-600">{tender.projectDescription}</p>
                      </div>

                      {!isContractor && viewerTradeRequirement && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="mb-2 font-semibold text-gray-900">
                            Your trade details ({viewerTradeRequirement.trade})
                          </h3>
                          <p className="text-gray-600">{viewerTradeRequirement.subDescription}</p>
                        </div>
                      )}

                      {tender.tradeRequirements?.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="mb-3 font-semibold text-gray-900">All Trade Requirements</h3>
                          <div className="space-y-4">
                            {tender.tradeRequirements.map((req) => (
                              <div key={req.id} className="border-l-4 border-blue-500 pl-4">
                                <h4 className="mb-1 font-medium text-gray-900">{req.trade}</h4>
                                <p className="text-sm text-gray-600">{req.subDescription}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="quotes" className="mt-6">
                  {isContractor ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Users className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                          <p className="text-gray-600">Quotes view will appear here once quotes are wired.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
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

                            <Button onClick={handleSubmitQuote} disabled={isSubmitting || !quotePrice} className="w-full">
                              <Send className="mr-2 h-4 w-4" />
                              {isSubmitting ? 'Submitting…' : 'Submit Quote'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start">
                    <MapPin className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{tender.suburb}</div>
                      <div className="text-sm text-gray-600">{tender.postcode}</div>
                    </div>
                  </div>
                  <Alert className="mt-4 border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-900">
                      Exact address will be shared after quote acceptance
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {(tender.budgetMinCents || tender.budgetMaxCents) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start">
                      <DollarSign className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {tender.budgetMinCents ? formatCurrency(tender.budgetMinCents) : '—'}{' '}
                          {tender.budgetMaxCents ? `- ${formatCurrency(tender.budgetMaxCents)}` : ''}
                        </div>
                        <div className="text-sm text-gray-600">Indicative range</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Posted By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="font-medium text-gray-900">
                      {tender.isNameHidden ? 'Verified Builder' : tender.builder.businessName || tender.builder.name || 'Builder'}
                    </div>
                    {!tender.isNameHidden && tender.builder.rating && tender.builder.completedJobs ? (
                      <div className="mt-1 text-sm text-gray-600">
                        ⭐ {tender.builder.rating} · {tender.builder.completedJobs} projects completed
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {tender.quoteCapTotal ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quote Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {tender.quoteCountTotal} / {tender.quoteCapTotal}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">Quotes received</div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ABNRequiredModal open={showABNModal} onOpenChange={setShowABNModal} returnUrl={`/tenders/${id}`} />
    </AppLayout>
  );
}
