'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { safeRouterPush } from '@/lib/safe-nav';
import Link from 'next/link';
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
  Sparkles
} from 'lucide-react';
import { formatCurrency, getTierBadgeColor, getTierDisplayName, getStatusBadgeColor, getStatusDisplayName, canSubmitQuote, getPublicQuoteStatus } from '@/lib/tender-utils';
import { formatDistanceToNow } from 'date-fns';
import { ABNRequiredModal } from '@/components/abn-required-modal';
import { hasValidABN } from '@/lib/abn-utils';
import { isUUID, parseTradeSuburbSlug } from '@/lib/slug-utils';
import TradeSuburbTenders from '@/components/trade-suburb-tenders';
import { checkQuoteSubmissionPermission } from '@/lib/permission-utils';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { callTradeHubAI } from '@/lib/ai-client';

export default function TenderDetailPage() {
  const { currentUser, isLoading } = useAuth();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  if (!isUUID(id)) {
    const parsed = parseTradeSuburbSlug(id);
    if (parsed) {
      return <TradeSuburbTenders trade={parsed.trade} suburb={parsed.suburb} />;
    }
  }
  const [activeTab, setActiveTab] = useState('overview');
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotePermissionError, setQuotePermissionError] = useState<string | null>(null);
  const [showABNModal, setShowABNModal] = useState(false);
  const [quoteAiLoading, setQuoteAiLoading] = useState(false);
  const [quoteAiError, setQuoteAiError] = useState<string | null>(null);

  const isBuilder = currentUser?.role === 'contractor';
  const isAdmin = currentUser?.role === 'admin';
  const isMyTender = (tender: any) => currentUser && tender.builderId === currentUser.id;

  const tender = {
    builderId: isBuilder ? currentUser.id : 'builder-123',
    id: params.id,
    projectName: 'Residential Extension Project',
    projectDescription: 'Looking for qualified contractors to complete a two-story residential extension including electrical, plumbing, and carpentry work.',
    status: 'LIVE',
    tier: 'PREMIUM_14',
    suburb: 'Sydney',
    postcode: '2000',
    isNameHidden: false,
    desiredStartDate: new Date('2025-02-01'),
    desiredEndDate: new Date('2025-06-30'),
    budgetMinCents: 5000000,
    budgetMaxCents: 8000000,
    quoteCapTotal: null,
    quoteCountTotal: 2,
    closesAt: new Date('2025-01-15'),
    createdAt: new Date('2025-01-01'),
    builder: {
      name: 'Smith Construction',
      businessName: 'Smith Construction Pty Ltd',
      rating: 4.8,
      completedJobs: 45,
    },
    tradeRequirements: [
      { id: '1', trade: 'Electrician', subDescription: 'Electrician: switchboard upgrade, 10 downlights, and compliance testing required.' },
      { id: '2', trade: 'Plumber', subDescription: 'Plumber: new bathroom fixtures, hot water system installation, and drainage work.' },
      { id: '3', trade: 'Carpenter', subDescription: 'Carpenter: framing for extension, door and window installation, and trim work.' },
    ],
    documents: [
      { id: '1', fileName: 'Floor Plan.pdf', fileUrl: '#', sizeBytes: 2500000 },
      { id: '2', fileName: 'Specifications.pdf', fileUrl: '#', sizeBytes: 1800000 },
    ],
    quotes: isBuilder ? [
      {
        id: '1',
        contractor: {
          name: 'John Electrician',
          businessName: 'John\'s Electrical Services',
          rating: 4.9,
          completedJobs: 120,
          trustStatus: 'verified',
        },
        priceCents: 6500000,
        notes: 'Happy to provide detailed quote for electrical work.',
        submittedAt: new Date('2025-01-02'),
        status: 'SUBMITTED',
      }
    ] : [],
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    const tradesList = tender.tradeRequirements?.map((req: any) => req.trade).join(', ') || '';
    const quoteStatus = getPublicQuoteStatus(tender.status, tender.quoteCapTotal ?? null, tender.quoteCountTotal);

    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
              href="/tenders"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Tenders
            </Link>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <Badge className={quoteStatus.color}>
                    {quoteStatus.label}
                  </Badge>
                </div>
                <CardTitle className="text-2xl blur-sm select-none pointer-events-none">
                  Project Details Hidden
                </CardTitle>
                <p className="text-sm text-gray-500 mt-2 blur-sm select-none pointer-events-none">
                  Full description available after sign in
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Location</h3>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{tender.suburb}, {tender.postcode}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Posted</h3>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{formatDistanceToNow(new Date(tender.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {tradesList && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Required Trades</h3>
                    <p className="text-gray-700 font-medium">{tradesList}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4 rounded-lg">
                  <div className="flex items-start space-x-3 mb-4">
                    <Lock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Sign in to access:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Full project description & scope</li>
                        <li>Budget range & timeline details</li>
                        <li>Project documents & plans</li>
                        <li>Builder information</li>
                        <li>Submit your quote</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button className="flex-1" onClick={() => safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login')}>
                    Sign in to view & quote
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => safeRouterPush(router, `/signup?returnUrl=/tenders/${tender.id}`, '/signup')}>
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

  const tradeMatchesTender = (tender: any) => {
    if (!tender.tradeRequirements || tender.tradeRequirements.length === 0) return false;
    return tender.tradeRequirements.some((req: any) => req.trade === currentUser.primaryTrade);
  };

  const viewerTradeRequirement = tender.tradeRequirements?.find(
    (req: any) => req.trade === currentUser.primaryTrade
  );

  if (!isMyTender(tender) && !isAdmin && !tradeMatchesTender(tender)) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
              href="/tenders"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Tenders
            </Link>
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">This tender isn't available for your trade.</h2>
              <p className="text-gray-600 mb-6">
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
  const isSubcontractor = currentUser.role === 'subcontractor';
  const quotesReachedLimit = canSubmitQuote(tender.quoteCapTotal, tender.quoteCountTotal);

  const canQuote = !isBuilder && tender.status === 'LIVE' && quotesReachedLimit && !(hasLimitedQuotes && isSubcontractor);

  const handleWriteQuoteWithAI = async () => {
    setQuoteAiError(null);
    setQuoteAiLoading(true);
    try {
      if (!currentUser?.id) {
        setQuoteAiError('Please log in to use AI features');
        return;
      }

      const message = await callTradeHubAI({
        userId: currentUser.id,
        mode: 'quote_helper',
        messages: [
          { role: 'user', content: 'Write a quote message template for this tender. Use placeholders, do not invent exact prices.' }
        ],
        context: {
          role: 'subcontractor',
          tender: {
            id: tender.id,
            title: tender.projectName,
            description: tender.projectDescription,
            requiredTrades: tender.tradeRequirements?.map((r: any) => r.trade) || [],
            suburb: tender.suburb,
            postcode: tender.postcode,
            dates: {
              start: tender.desiredStartDate,
              end: tender.desiredEndDate,
            },
          },
          subcontractor: {
            primaryTrade: currentUser.primaryTrade,
            name: currentUser.name,
          },
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
      setShowABNModal(true);
      return;
    }

    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      alert('Please enter a valid quote amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setQuotePermissionError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        safeRouterPush(router, `/login?returnUrl=/tenders/${tender.id}`, '/login');
        return;
      }

      const permission = await checkQuoteSubmissionPermission(session.access_token, tender.id as string);

      if (!permission.canSubmit) {
        setQuotePermissionError(permission.message || permission.reason);
        setIsSubmitting(false);
        return;
      }

      console.log('Submitting quote...');
      setTimeout(() => {
        setIsSubmitting(false);
        alert('Quote submitted successfully!');
        setQuotePrice('');
        setQuoteNotes('');
      }, 1000);
    } catch (error) {
      console.error('Error submitting quote:', error);
      setQuotePermissionError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const dashboardHref = isBuilder ? '/dashboard/contractor' : '/dashboard/subcontractor';

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={dashboardHref}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-2">
                    <Badge className={getTierBadgeColor(tender.tier)}>
                      {getTierDisplayName(tender.tier)}
                    </Badge>
                    <Badge className={getStatusBadgeColor(tender.status)}>
                      {getStatusDisplayName(tender.status)}
                    </Badge>
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
                <TabsTrigger value="quotes">
                  Quotes {isBuilder && `(${tender.quotes?.length || 0})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Project Description</h3>
                      <p className="text-gray-600">{tender.projectDescription}</p>
                    </div>

                    {!isBuilder && viewerTradeRequirement && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Your trade details ({viewerTradeRequirement.trade})
                        </h3>
                        <p className="text-gray-600">{viewerTradeRequirement.subDescription}</p>
                      </div>
                    )}

                    {isBuilder && tender.tradeRequirements && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Required Trades</h3>
                        <div className="flex flex-wrap gap-2">
                          {tender.tradeRequirements.map((req: any) => (
                            <Badge key={req.id} variant="outline">
                              {req.trade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            Starts: {tender.desiredStartDate.toLocaleDateString('en-AU')}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            Ends: {tender.desiredEndDate.toLocaleDateString('en-AU')}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            Closes: {tender.closesAt.toLocaleDateString('en-AU')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardContent className="pt-6">
                    {tender.documents.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No documents attached</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tender.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium text-gray-900">{doc.fileName}</div>
                                <div className="text-sm text-gray-500">
                                  {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Download
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
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Project Description</h3>
                      <p className="text-gray-600">{tender.projectDescription}</p>
                    </div>

                    {!isBuilder && viewerTradeRequirement && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Your trade details ({viewerTradeRequirement.trade})
                        </h3>
                        <p className="text-gray-600">{viewerTradeRequirement.subDescription}</p>
                      </div>
                    )}

                    {isBuilder && tender.tradeRequirements && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">All Trade Requirements</h3>
                        <div className="space-y-4">
                          {tender.tradeRequirements.map((req: any) => (
                            <div key={req.id} className="border-l-4 border-blue-500 pl-4">
                              <h4 className="font-medium text-gray-900 mb-1">{req.trade}</h4>
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
                {isBuilder ? (
                  <div className="space-y-4">
                    {tender.quotes && tender.quotes.length > 0 ? (
                      tender.quotes.map((quote) => (
                        <Card key={quote.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {quote.contractor.businessName || quote.contractor.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{quote.contractor.trustStatus}</Badge>
                                  <span className="text-sm text-gray-600">
                                    ⭐ {quote.contractor.rating} · {quote.contractor.completedJobs} jobs
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatCurrency(quote.priceCents)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {quote.submittedAt.toLocaleDateString('en-AU')}
                                </div>
                              </div>
                            </div>
                            {quote.notes && (
                              <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
                                {quote.notes}
                              </p>
                            )}
                            <div className="flex gap-2 mt-4">
                              <Button variant="default" size="sm">Accept Quote</Button>
                              <Button variant="outline" size="sm">Message</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <CardContent className="py-12">
                          <div className="text-center">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No quotes yet</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      {!canQuote ? (
                        <Alert variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            {hasLimitedQuotes && isSubcontractor
                              ? 'This tender has limited quotes enabled. Only registered contractors (not subcontractors) can submit quotes for this tender.'
                              : 'This tender has reached its quote limit and is no longer accepting submissions.'
                            }
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-4">
                          {quotePermissionError ? (
                            <Alert className="bg-red-50 border-red-200">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <AlertDescription className="text-red-900">
                                {quotePermissionError}
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="bg-blue-50 border-blue-200">
                              <Info className="w-4 h-4 text-blue-600" />
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
                                <Sparkles className="w-3 h-3" />
                                {quoteAiLoading ? 'Writing...' : 'Write with AI'}
                              </Button>
                              {quoteAiError && (
                                <p className="text-sm text-red-600 flex-1">{quoteAiError}</p>
                              )}
                            </div>
                          </div>

                          <Button
                            onClick={handleSubmitQuote}
                            disabled={isSubmitting || !quotePrice}
                            className="w-full"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Submitting...' : 'Submit Quote'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{tender.suburb}</div>
                    <div className="text-sm text-gray-600">{tender.postcode}</div>
                  </div>
                </div>
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-900">
                    Exact address will be shared after quote acceptance
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(tender.budgetMinCents)} - {formatCurrency(tender.budgetMaxCents)}
                    </div>
                    <div className="text-sm text-gray-600">Indicative range</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posted By</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="font-medium text-gray-900">
                    {tender.isNameHidden ? 'Verified Builder' : tender.builder.businessName || tender.builder.name}
                  </div>
                  {!tender.isNameHidden && (
                    <div className="text-sm text-gray-600 mt-1">
                      ⭐ {tender.builder.rating} · {tender.builder.completedJobs} projects completed
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {tender.quoteCapTotal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quote Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {tender.quoteCountTotal} / {tender.quoteCapTotal}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Quotes received</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>

      <ABNRequiredModal
        open={showABNModal}
        onOpenChange={setShowABNModal}
        returnUrl={`/tenders/${params.id}`}
      />
    </AppLayout>
  );
}
