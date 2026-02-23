'use client';

/*
 * QA notes — ABN gating (Tenders create):
 * - /tenders/create redirects unverified users to /verify-business (returnUrl=/tenders/create); no form flash.
 * - /tenders list and /tenders/[id] are browseable for unverified. No TradeGate in tenders flow.
 * - Publish/commit actions on tender create are gated by ABN.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { useUpgradeCheckout } from '@/lib/use-upgrade-checkout';
import { isAdmin } from '@/lib/is-admin';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { buildLoginUrl } from '@/lib/url-utils';
import { callTradeHubAI } from '@/lib/ai-client';
import { hasBuilderPremium } from '@/lib/capability-utils';
import { needsBusinessVerification, redirectToVerifyBusiness, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { trackEvent } from '@/lib/analytics';

import { TRADE_CATEGORIES } from '@/lib/trades';
import { TenderTier } from '@/lib/tender-types';

import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { ApprovalConfirmationModal } from '@/components/approval-confirmation-modal';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AlertCircle, ChevronLeft, ChevronRight, Info, Upload, X, Sparkles } from 'lucide-react';

interface TradeRequirement {
  trade: string;
  subDescription: string;
  budgetMin?: string;
  budgetMax?: string;
  files?: File[];
  links?: string[];
}

function norm(v?: string | null) {
  return String(v || '').trim().toLowerCase();
}

// (Display-only) DD/MM/YYYY preview for Review screen
function toAussieDate(value?: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-'); // expecting YYYY-MM-DD
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
          done ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700',
        ].join(' ')}
      >
        {done ? '✓' : label}
      </div>
    </div>
  );
}

export default function CreateTenderPage() {
  const { session, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const { handleUpgrade, isLoading: checkoutLoading } = useUpgradeCheckout('SUBCONTRACTOR_PRO_10');
  const supabase = useMemo(() => getBrowserSupabase(), []);

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [builderFreeTrialUsed, setBuilderFreeTrialUsed] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [tradeRequirements, setTradeRequirements] = useState<TradeRequirement[]>([]);
  const [selectedTradeToAdd, setSelectedTradeToAdd] = useState('');

  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');

  // ✅ Store as YYYY-MM-DD (native date input)
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [desiredEndDate, setDesiredEndDate] = useState('');

  const [isNameHidden, setIsNameHidden] = useState(false);

  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const needsAbn = useMemo(() => needsBusinessVerification(currentUser), [currentUser]);
  const isAbnVerified = currentUser ? !needsBusinessVerification(currentUser) : false;
  const isAdminUser = isAdmin(currentUser);

  const returnUrl = '/tenders/create';
  const verifyUrl = getVerifyBusinessUrl(returnUrl);
  const hasRedirectedAbn = useRef(false);

  // ✅ Tier is removed from UI. Default to FREE_TRIAL for now.
  const DEFAULT_TIER: TenderTier = 'FREE_TRIAL';

  // ✅ 3-step flow now: Project -> Location -> Review
  const totalSteps = 3;

  // ---- ABN gate: redirect only after profile has loaded (avoid gating verified users during load). ----
  useEffect(() => {
    if (isLoading || hasRedirectedAbn.current) return;
    if (!currentUser) return; // wait for profile

    if (needsAbn && !isAdmin(currentUser)) {
      hasRedirectedAbn.current = true;
      redirectToVerifyBusiness(router, returnUrl);
    }
  }, [isLoading, currentUser, needsAbn, router, returnUrl]);

  // ---- Permissions + plan lookup ----
  useEffect(() => {
    if (isLoading) return;

    const run = async () => {
      try {
        setCheckingPermissions(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push(buildLoginUrl(returnUrl));
          return;
        }

        // Only need this now to preserve FREE_TRIAL used logic (if you want)
        await fetchBuilderTrialStatus();
      } catch (err) {
        console.error('Error validating permissions:', err);
        router.push('/tenders');
      } finally {
        setCheckingPermissions(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentUser?.id]);

  const fetchBuilderTrialStatus = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('users')
        .select('builder_free_trial_tender_used')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        setBuilderFreeTrialUsed(!!data.builder_free_trial_tender_used);
      }
    } catch (err) {
      console.error('Error fetching builder trial status:', err);
    }
  };

  const availableTradesToAdd = useMemo(
    () => TRADE_CATEGORIES.filter((trade) => !tradeRequirements.find((req) => req.trade === trade)),
    [tradeRequirements]
  );

  // ✅ Keep end date valid if start date changes
  useEffect(() => {
    if (desiredStartDate && desiredEndDate && desiredEndDate < desiredStartDate) {
      setDesiredEndDate('');
    }
  }, [desiredStartDate, desiredEndDate]);

  const getTradePlaceholder = (trade: string): string => {
    const placeholders: Record<string, string> = {
      Electrician: 'e.g., switchboard upgrade, downlights, power points, compliance testing...',
      Plumber: 'e.g., rough-in plumbing, hot water unit, bathroom fit-off, drainage...',
      Carpenter: 'e.g., framing, doors, skirting, fix-out, cabinetry install...',
      'Painter & Decorator': 'e.g., prep + patch, ceilings/walls, trims, 2-coat finish...',
    };
    return placeholders[trade] || 'e.g., describe what this trade should price and any key notes...';
  };

  // ---- Trades CRUD ----
  const handleAddTrade = () => {
    if (!selectedTradeToAdd) return;
    if (tradeRequirements.find((req) => req.trade === selectedTradeToAdd)) {
      setError('This trade has already been added');
      return;
    }
    setTradeRequirements([...tradeRequirements, { trade: selectedTradeToAdd, subDescription: '' }]);
    setSelectedTradeToAdd('');
    setError('');
  };

  const handleRemoveTrade = (trade: string) => {
    setTradeRequirements(tradeRequirements.filter((req) => req.trade !== trade));
  };

  const handleUpdateTradeDescription = (trade: string, description: string) => {
    setTradeRequirements(
      tradeRequirements.map((req) => (req.trade === trade ? { ...req, subDescription: description } : req))
    );
  };

  const handleUpdateTradeBudget = (trade: string, field: 'budgetMin' | 'budgetMax', value: string) => {
    const numbers = value.replace(/\D/g, '');
    setTradeRequirements(tradeRequirements.map((req) => (req.trade === trade ? { ...req, [field]: numbers } : req)));
  };

  const handleTradeFileUpload = (trade: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setTradeRequirements(
      tradeRequirements.map((req) =>
        req.trade === trade ? { ...req, files: [...(req.files || []), ...fileArray] } : req
      )
    );
  };

  const handleRemoveTradeFile = (trade: string, fileIndex: number) => {
    setTradeRequirements(
      tradeRequirements.map((req) =>
        req.trade === trade ? { ...req, files: req.files?.filter((_, i) => i !== fileIndex) } : req
      )
    );
  };

  // ---- AI ----
  const handleDraftWithAI = async () => {
    setAiError(null);
    setAiLoading(true);

    try {
      if (!currentUser?.id) {
        setAiError('Please log in to use AI features');
        return;
      }

      const message = await callTradeHubAI({
        userId: currentUser.id,
        mode: 'tender_draft',
        messages: [{ role: 'user', content: 'Draft a ready-to-post tender using the provided context.' }],
        context: {
          role: 'contractor',
          projectName: projectName || 'Untitled Project',
          projectDescription: projectDescription || '',
          requiredTrades: tradeRequirements.map((r) => r.trade),
          suburb: suburb || null,
          postcode: postcode || null,
          startDate: desiredStartDate || null,
          endDate: desiredEndDate || null,
        },
      });

      setProjectDescription(message.content);
    } catch (e: any) {
      setAiError(e?.message || 'AI draft failed');
    } finally {
      setAiLoading(false);
    }
  };

  // ---- Step navigation ----
  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!projectName.trim()) return setError('Please enter a project name');
      if (!projectDescription.trim()) return setError('Please enter a project description');
      if (tradeRequirements.length === 0) return setError('Please add at least one required trade');

      for (const req of tradeRequirements) {
        if (!req.subDescription.trim()) return setError(`Please add trade-specific details for ${req.trade}`);
        if (req.subDescription.trim().length < 10) {
          return setError(`Trade-specific details for ${req.trade} must be at least 10 characters`);
        }
      }
    }

    if (step === 2) {
      if (!suburb.trim()) return setError('Please enter a suburb');
      if (!postcode.trim()) return setError('Please enter a postcode');
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  // ---- Shared create logic ----
  const createTender = async (mode: 'verified' | 'guest') => {
    setError('');

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setError('Authentication required. Please log in to create tenders.');
      return;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      setError('User profile not found. Please log in with a valid contractor account.');
      return;
    }

    // ✅ Guardrail: limit pending guest tenders (single-account: applies to non-admins)
    if (mode === 'guest' && !isAdmin(userProfile)) {
      const { count, error: pendingErr } = await supabase
        .from('tenders')
        .select('id', { count: 'exact', head: true })
        .eq('builder_id', authUser.id)
        .eq('status', 'PENDING_APPROVAL');

      if (pendingErr) throw pendingErr;

      const MAX_PENDING = 1;
      if ((count ?? 0) >= MAX_PENDING) {
        setError(
          "You already have a tender pending approval. Please wait for review, or verify your business to publish instantly."
        );
        return;
      }
    }

    // VERIFIED posting requires ABN (unless admin)
    if (mode === 'verified' && userProfile.role !== 'admin' && needsAbn) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }

    const tierToUse: TenderTier = DEFAULT_TIER;
    const statusToUse = mode === 'guest' ? ('PENDING_APPROVAL' as any) : ('PUBLISHED' as any);

    const tradeReqsForApi = tradeRequirements.map((req) => ({
      trade: req.trade,
      subDescription: req.subDescription,
      budgetMin: req.budgetMin,
      budgetMax: req.budgetMax,
    }));

    const res = await fetch('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        projectDescription,
        suburb,
        postcode,
        isNameHidden,
        status: statusToUse,
        tier: tierToUse,
        tradeRequirements: tradeReqsForApi,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 403 && data.error) {
        toast.error(data.error);
        setError(data.error);
        return;
      }
      throw new Error(data.error || 'Failed to create tender');
    }

    const tender = data.tender;
    if (!tender?.id) throw new Error('Invalid response from server');

    if (tierToUse === 'FREE_TRIAL' && !builderFreeTrialUsed) {
      await supabase.from('users').update({ builder_free_trial_tender_used: true }).eq('id', authUser.id);
    }

    trackEvent('tender_created', tender?.id != null ? { tenderId: tender.id } : {});
    setShowApprovalModal(true);
  };

  const handleSubmitVerified = async () => {
    setLoading(true);
    try {
      await createTender('verified');
    } catch (err: any) {
      console.error('Error creating tender:', err);
      setError(err?.message ? `Error: ${err.message}` : 'Failed to create tender. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGuest = async () => {
    setLoading(true);
    try {
      await createTender('guest');
    } catch (err: any) {
      console.error('Error creating tender (guest):', err);
      setError(err?.message ? `Error: ${err.message}` : 'Failed to submit tender for approval. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Loading / permission states: wait for profile so form doesn't flash ----
  if (isLoading || checkingPermissions || (session && !currentUser)) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  const premiumOk =
    MVP_FREE_MODE
      ? true
      : currentUser?.role !== 'subcontractor'
        ? true
        : hasBuilderPremium(currentUser);

  if (!premiumOk) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Upgrade Required</CardTitle>
                <CardDescription>Posting tenders requires a premium subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    As a subcontractor, you need the Subcontractor Pro ($10/month) or All-Access Pro ($26/month) plan to post tenders.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => handleUpgrade('tenders_premium_locked')} disabled={checkoutLoading}>
                    {checkoutLoading ? 'Loading…' : 'Upgrade to Post Tenders'}
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  const done1 = step > 1;
  const done2 = step > 2;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            backLink={{ href: '/dashboard' }}
            title="Create New Tender"
            description="Post a project tender and receive quotes from qualified contractors"
          />

          {!isAdminUser && !isAbnVerified && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Business verification recommended</div>
                  <div className="text-sm">
                    Verified businesses can publish instantly. If you’re not verified yet, you can either verify now, or submit this tender as a guest for admin approval.
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={() => router.push(verifyUrl)}>
                      Verify business
                    </Button>
                    <Badge variant="outline">Guest posting requires approval</Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Stepper (Tier removed) */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <StepPill label="1" active={step === 1} done={done1} />
                  <span className="text-sm font-medium">Project</span>
                </div>

                <div className="h-px w-8 bg-gray-200 sm:w-14" />

                <div className="flex items-center gap-2">
                  <StepPill label="2" active={step === 2} done={done2} />
                  <span className="text-sm font-medium">Location</span>
                </div>

                <div className="h-px w-8 bg-gray-200 sm:w-14" />

                <div className="flex items-center gap-2">
                  <StepPill label="3" active={step === 3} done={false} />
                  <span className="text-sm font-medium">Review</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 1 */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Project details</CardTitle>
                <CardDescription>Describe the project and what trades should quote.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Project name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Bathroom renovation (Mill Park)"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Project description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleDraftWithAI}
                      disabled={aiLoading}
                      title="Draft with TradeHub AI"
                    >
                      <Sparkles className="h-4 w-4" />
                      {aiLoading ? 'Drafting…' : 'Draft with AI'}
                    </Button>
                  </div>

                  <Textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Give an overview, what’s included/excluded, site access, timing, expectations, etc."
                    rows={6}
                  />

                  {aiError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{aiError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Required trades</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={selectedTradeToAdd} onValueChange={setSelectedTradeToAdd}>
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="Select a trade to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTradesToAdd.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" onClick={handleAddTrade} disabled={!selectedTradeToAdd}>
                      Add trade
                    </Button>
                  </div>

                  {tradeRequirements.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Add at least one required trade.</div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      {tradeRequirements.map((req) => (
                        <Card key={req.trade} className="border-gray-200">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-base">{req.trade}</CardTitle>
                                <CardDescription className="text-sm">
                                  Add trade-specific details so quotes are accurate.
                                </CardDescription>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveTrade(req.trade)}
                                title="Remove trade"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            <Textarea
                              value={req.subDescription}
                              onChange={(e) => handleUpdateTradeDescription(req.trade, e.target.value)}
                              placeholder={getTradePlaceholder(req.trade)}
                              rows={4}
                            />

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Budget min (optional)</Label>
                                <Input
                                  inputMode="numeric"
                                  value={req.budgetMin ?? ''}
                                  onChange={(e) => handleUpdateTradeBudget(req.trade, 'budgetMin', e.target.value)}
                                  placeholder="e.g. 2500"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Budget max (optional)</Label>
                                <Input
                                  inputMode="numeric"
                                  value={req.budgetMax ?? ''}
                                  onChange={(e) => handleUpdateTradeBudget(req.trade, 'budgetMax', e.target.value)}
                                  placeholder="e.g. 5000"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Attachments (optional)</Label>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input type="file" multiple onChange={(e) => handleTradeFileUpload(req.trade, e.target.files)} />
                                <Badge variant="outline" className="w-fit">
                                  <Upload className="mr-1 h-3.5 w-3.5" />
                                  {req.files?.length ?? 0} files
                                </Badge>
                              </div>

                              {req.files?.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {req.files.map((f, idx) => (
                                    <Badge key={`${req.trade}-${idx}`} variant="secondary" className="gap-2">
                                      <span className="max-w-[240px] truncate">{f.name}</span>
                                      <button
                                        type="button"
                                        className="opacity-70 hover:opacity-100"
                                        onClick={() => handleRemoveTradeFile(req.trade, idx)}
                                        title="Remove file"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    <Info className="mr-1 inline h-4 w-4" />
                    Tip: Be specific (scope, finishes, exclusions) to get better quotes.
                  </div>

                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Location & timing</CardTitle>
                <CardDescription>Where is the job, and roughly when do you want it done?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <SuburbAutocomplete
                  value={suburb}
                  postcode={postcode}
                  onSuburbChange={setSuburb}
                  onPostcodeChange={setPostcode}
                  required
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Desired start date (optional)</Label>
                    <Input type="date" value={desiredStartDate} onChange={(e) => setDesiredStartDate(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Desired end date (optional)</Label>
                    <Input
                      type="date"
                      value={desiredEndDate}
                      min={desiredStartDate || undefined}
                      onChange={(e) => setDesiredEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox checked={isNameHidden} onCheckedChange={(v) => setIsNameHidden(Boolean(v))} />
                  <div>
                    <div className="text-sm font-medium">Hide business name until engagement</div>
                    <div className="text-sm text-muted-foreground">Your profile will show as “Builder (hidden)”.</div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>

                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3 (Review) */}
          {step === totalSteps && (
            <Card>
              <CardHeader>
                <CardTitle>Review & post</CardTitle>
                <CardDescription>Check everything looks right, then publish or submit as guest.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border bg-white p-4">
                  <div className="text-sm text-muted-foreground">Project name</div>
                  <div className="font-medium">{projectName || '—'}</div>

                  <div className="mt-3 text-sm text-muted-foreground">Suburb / postcode</div>
                  <div className="font-medium">{[suburb, postcode].filter(Boolean).join(', ') || '—'}</div>

                  <div className="mt-3 text-sm text-muted-foreground">Trades</div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tradeRequirements.length ? (
                      tradeRequirements.map((t) => (
                        <Badge key={t.trade} variant="secondary">
                          {t.trade}
                        </Badge>
                      ))
                    ) : (
                      <span className="font-medium">—</span>
                    )}
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">Name visibility</div>
                  <div className="font-medium">{isNameHidden ? 'Hidden' : 'Shown'}</div>

                  <div className="mt-3 text-sm text-muted-foreground">Desired dates</div>
                  <div className="font-medium">
                    {desiredStartDate || desiredEndDate
                      ? `${toAussieDate(desiredStartDate)} → ${toAussieDate(desiredEndDate)}`
                      : '—'}
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">Tender tier</div>
                  <div className="font-medium">Free Trial</div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" onClick={handleBack} disabled={loading || step <= 1} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>

                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    {!isAdminUser && !isAbnVerified ? (
                      <Button onClick={() => router.push(verifyUrl)} disabled={loading}>
                        Verify business to publish
                      </Button>
                    ) : (
                      <Button onClick={handleSubmitVerified} disabled={loading}>
                        {loading ? 'Publishing…' : 'Publish tender'}
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      onClick={handleSubmitGuest}
                      disabled={loading || needsAbn}
                      title="Submits for admin approval"
                    >
                      {loading ? 'Submitting…' : 'Post as guest (admin approval)'}
                    </Button>
                  </div>
                </div>

                {!isAdminUser && !isAbnVerified && (
                  <div className="text-sm text-muted-foreground">
                    Guest tenders stay pending until reviewed and won’t appear in the public tenders list until approved.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ApprovalConfirmationModal
        open={showApprovalModal}
        onOpenChange={setShowApprovalModal}
        type="tender"
        redirectPath="/tenders"
      />
    </AppLayout>
  );
}
