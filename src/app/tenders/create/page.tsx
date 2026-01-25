'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { buildLoginUrl } from '@/lib/url-utils';
import { callTradeHubAI } from '@/lib/ai-client';
import { getTenderDurationDays } from '@/lib/tender-utils';
import { hasBuilderPremium } from '@/lib/capability-utils';

import { TRADE_CATEGORIES } from '@/lib/trades';
import { TenderTier } from '@/lib/tender-types';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
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

import { AlertCircle, Check, ChevronLeft, ChevronRight, Info, Upload, X, Sparkles } from 'lucide-react';

interface TradeRequirement {
  trade: string;
  subDescription: string;
  budgetMin?: string;
  budgetMax?: string;
  files?: File[];
  links?: string[];
}

/**
 * IMPORTANT PRICING DECISION (per your latest decision):
 * - Only show:
 *   1) Free Trial (if not used)
 *   2) One-time $15 (premium-like reach/visibility)  -> mapped to existing tier value "PREMIUM_14"
 *   3) Premium Plan (subscription)                  -> not a per-tender tier; CTA to /pricing
 *
 * NOTE:
 * We intentionally map "One-time $15" to "PREMIUM_14" because your existing backend logic
 * already treats PREMIUM_14 as the premium-style tender (unlimited quotes cap, longer duration, etc.).
 * Later, you can rename the enum/values in lib/tender-types if you want — this page will still work.
 */

export default function CreateTenderPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [hasBuilderSubscription, setHasBuilderSubscription] = useState(false);
  const [builderFreeTrialUsed, setBuilderFreeTrialUsed] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [tradeRequirements, setTradeRequirements] = useState<TradeRequirement[]>([]);
  const [selectedTradeToAdd, setSelectedTradeToAdd] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [desiredEndDate, setDesiredEndDate] = useState('');
  const [isNameHidden, setIsNameHidden] = useState(false);

  // We keep TenderTier from your types; "PREMIUM_14" will represent "One-time $15" on UI.
  const [selectedTier, setSelectedTier] = useState<TenderTier | null>(null);

  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ---- Permissions + plan lookup ----
  useEffect(() => {
    if (currentUser) {
      fetchBuilderSubscription();
      validatePermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const validatePermissions = async () => {
    try {
      setCheckingPermissions(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(buildLoginUrl('/tenders/create'));
        return;
      }

      if (currentUser?.role !== 'contractor' && currentUser?.role !== 'admin') {
        router.push('/tenders');
        return;
      }
    } catch (err) {
      console.error('Error validating permissions:', err);
      router.push('/tenders');
    } finally {
      setCheckingPermissions(false);
    }
  };

  const fetchBuilderSubscription = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data, error } = await supabase
        .from('users')
        .select('builder_plan, builder_free_trial_tender_used')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        const subscribed = data.builder_plan === 'PREMIUM_SUBSCRIPTION';
        setHasBuilderSubscription(subscribed);
        setBuilderFreeTrialUsed(!!data.builder_free_trial_tender_used);

        // If subscribed, we skip tier step later, and force premium-like tier.
        if (subscribed) {
          setSelectedTier('PREMIUM_14');
        }
      }
    } catch (err) {
      console.error('Error fetching builder subscription:', err);
    }
  };

  // ---- Derived ----
  const totalSteps = hasBuilderSubscription ? 3 : 4;

  const availableTradesToAdd = useMemo(
    () => TRADE_CATEGORIES.filter((trade) => !tradeRequirements.find((req) => req.trade === trade)),
    [tradeRequirements]
  );

  const getTenderCloseDate = () => {
    if (!selectedTier) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const days = getTenderDurationDays(selectedTier);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  };

  const calculatedCloseDate = getTenderCloseDate();
  const closesAtDisplay = calculatedCloseDate.toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ---- Helpers ----
  const formatDateInputDDMMYYYY = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const handleDateChange = (field: 'desiredStartDate' | 'desiredEndDate', value: string) => {
    const formatted = formatDateInputDDMMYYYY(value);
    if (field === 'desiredStartDate') setDesiredStartDate(formatted);
    else setDesiredEndDate(formatted);
  };

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

  const handleAddTradeLink = (trade: string, link: string) => {
    if (!link.trim()) return;

    setTradeRequirements(
      tradeRequirements.map((req) => (req.trade === trade ? { ...req, links: [...(req.links || []), link] } : req))
    );
  };

  const handleRemoveTradeLink = (trade: string, linkIndex: number) => {
    setTradeRequirements(
      tradeRequirements.map((req) => (req.trade === trade ? { ...req, links: req.links?.filter((_, i) => i !== linkIndex) } : req))
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
        if (req.subDescription.trim().length < 10)
          return setError(`Trade-specific details for ${req.trade} must be at least 10 characters`);
      }
    }

    if (step === 2) {
      if (!suburb.trim()) return setError('Please enter a suburb');
      if (!postcode.trim()) return setError('Please enter a postcode');

      // If subscribed, skip tier step (go straight to review)
      if (hasBuilderSubscription) {
        setStep(step + 2);
        return;
      }
    }

    if (step === 3 && !hasBuilderSubscription) {
      if (!selectedTier) return setError('Please select a tier');
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (!selectedTier) {
        setError('Please select a tier before publishing');
        return;
      }

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

      // admins may be allowed in your app, but your old logic hard-blocked non-contractor.
      // Keep your existing behavior unless you want admin allowed too:
      if (userProfile.role !== 'contractor') {
        setError(`Only contractors can create tenders. Your account is a ${userProfile.role} account.`);
        return;
      }

      const convertDDMMYYYYToISO = (dateStr: string): string | null => {
        if (!dateStr || dateStr.length !== 10) return null;
        const [day, month, year] = dateStr.split('/').map(Number);
        if (!day || !month || !year || year < 2000 || year > 2100) return null;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      // Premium-like tier has unlimited quotes cap (null)
      const quoteCapTotal =
        selectedTier === 'PREMIUM_14' ? null : selectedTier === 'FREE_TRIAL' ? 3 : 3;

      const tenderData = {
        builder_id: authUser.id,
        status: 'DRAFT',
        tier: selectedTier,
        is_name_hidden: isNameHidden,
        project_name: projectName,
        project_description: projectDescription,
        suburb,
        postcode,
        lat: 0,
        lng: 0,
        desired_start_date: convertDDMMYYYYToISO(desiredStartDate),
        desired_end_date: convertDDMMYYYYToISO(desiredEndDate),
        quote_cap_total: quoteCapTotal,
        quote_count_total: 0,
        closes_at: calculatedCloseDate.toISOString(),
        approval_status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: tender, error: tenderError } = await supabase.from('tenders').insert(tenderData).select().single();
      if (tenderError) throw tenderError;

      const tradeReqs = tradeRequirements.map((req) => ({
        tender_id: tender.id,
        trade: req.trade,
        sub_description: req.subDescription,
        min_budget_cents: req.budgetMin ? Math.round(parseFloat(req.budgetMin) * 100) : null,
        max_budget_cents: req.budgetMax ? Math.round(parseFloat(req.budgetMax) * 100) : null,
        documents: req.files ? req.files.map((f) => ({ name: f.name, size: f.size })) : [],
        links: req.links || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: tradeError } = await supabase.from('tender_trade_requirements').insert(tradeReqs);
      if (tradeError) throw tradeError;

      // If Free Trial selected, mark as used
      if (selectedTier === 'FREE_TRIAL' && !builderFreeTrialUsed) {
        await supabase.from('users').update({ builder_free_trial_tender_used: true }).eq('id', authUser.id);
      }

      setShowApprovalModal(true);
    } catch (err: any) {
      console.error('Error creating tender:', err);

      let errorMessage = 'Failed to create tender. Please try again.';
      if (err?.message) {
        if (err.message.includes('tier')) errorMessage = 'Please select a valid tender tier.';
        else if (err.message.includes('duplicate') || err.message.includes('unique'))
          errorMessage = 'A tender with these details already exists.';
        else if (err.message.includes('violates')) errorMessage = 'Invalid data provided. Please check all fields.';
        else errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ---- Loading / permission states ----
  if (!currentUser || checkingPermissions) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  // Keep your existing gating behavior
  if (currentUser.role === 'subcontractor' && !hasBuilderPremium(currentUser)) {
    return (
      <TradeGate>
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

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">All-Access Pro includes:</h3>
                    <ul className="list-inside list-disc space-y-1 text-gray-600">
                      <li>Post unlimited tenders</li>
                      <li>Hire subcontractors for your projects</li>
                      <li>All subcontractor pro features</li>
                      <li>Priority support</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => router.push('/pricing')}>View Pricing</Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/subcontractor')}>
                      Back to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </AppLayout>
      </TradeGate>
    );
  }

  // ---- Render ----
  return (
    <TradeGate>
      <AppLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <PageHeader
              backLink={{ href: '/dashboard/contractor' }}
              title="Create New Tender"
              description="Post a project tender and receive quotes from qualified contractors"
            />

            {/* Stepper */}
            <div className="mb-6 mt-8">
              <div className="flex items-center justify-center gap-2">
                {[...Array(totalSteps)].map((_, i) => {
                  const n = i + 1;
                  const isDone = n < step;
                  const isCurrent = n === step;

                  return (
                    <div key={n} className="flex items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isDone
                            ? 'bg-green-600 text-white'
                            : isCurrent
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isDone ? <Check className="h-4 w-4" /> : n}
                      </div>

                      {i < totalSteps - 1 && (
                        <div className={`h-0.5 w-16 ${isDone ? 'bg-green-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-center text-sm text-gray-600">
                Step {step} of {totalSteps}
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-xl font-bold text-gray-900">Project Details</h3>
                      <p className="mb-6 text-sm text-gray-600">Tell contractors about your project</p>
                    </div>

                    <div>
                      <Label htmlFor="projectName">Project Name *</Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g., Residential Extension Project"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="projectDescription">Project Description *</Label>
                      <p className="mb-2 mt-1 text-xs text-gray-500">
                        Provide a general overview of the project that all trades will see.
                      </p>
                      <Textarea
                        id="projectDescription"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="Describe your project requirements, scope, and any important details..."
                        rows={5}
                        className="mt-1"
                      />

                      <div className="mt-2 flex items-start gap-2">
                        <Button
                          type="button"
                          variant="secondary-red"
                          size="sm"
                          onClick={handleDraftWithAI}
                          disabled={aiLoading || !projectName.trim()}
                          className="flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          {aiLoading ? 'Drafting…' : 'Draft with AI'}
                        </Button>

                        {aiError && <p className="flex-1 text-sm text-red-600">{aiError}</p>}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Required trades *</Label>
                      <p className="mb-3 text-xs text-gray-500">Add each trade you want to receive quotes from.</p>

                      <div className="mb-4 flex gap-2">
                        <Select value={selectedTradeToAdd} onValueChange={setSelectedTradeToAdd}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a trade" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTradesToAdd.map((trade) => (
                              <SelectItem key={trade} value={trade}>
                                {trade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="secondary-red"
                          onClick={handleAddTrade}
                          disabled={!selectedTradeToAdd}
                        >
                          Add trade
                        </Button>
                      </div>

                      {tradeRequirements.length > 0 ? (
                        <div className="space-y-4">
                          {tradeRequirements.map((req) => (
                            <Card key={req.trade} className="border-gray-300">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base font-semibold">{req.trade}</CardTitle>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveTrade(req.trade)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardHeader>

                              <CardContent>
                                <Label htmlFor={`trade-${req.trade}`}>Trade-specific details *</Label>
                                <p className="mb-2 mt-1 text-xs text-gray-500">
                                  Describe what this trade should price and any key notes.
                                </p>

                                <Textarea
                                  id={`trade-${req.trade}`}
                                  value={req.subDescription}
                                  onChange={(e) => handleUpdateTradeDescription(req.trade, e.target.value)}
                                  placeholder={getTradePlaceholder(req.trade)}
                                  rows={3}
                                  className="mt-1"
                                />

                                <div className="mt-4">
                                  <Label className="mb-3 block">Budget (Optional)</Label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                                      <Input
                                        type="text"
                                        value={req.budgetMin || ''}
                                        onChange={(e) => handleUpdateTradeBudget(req.trade, 'budgetMin', e.target.value)}
                                        placeholder="0"
                                        className="pl-7"
                                      />
                                    </div>

                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                                      <Input
                                        type="text"
                                        value={req.budgetMax || ''}
                                        onChange={(e) => handleUpdateTradeBudget(req.trade, 'budgetMax', e.target.value)}
                                        placeholder="0"
                                        className="pl-7"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <Label className="mb-2 block">Supporting documents (Optional)</Label>
                                  <p className="mb-3 text-xs text-gray-500">
                                    Upload files or add links to relevant documents for this specific trade
                                  </p>

                                  <div className="space-y-3">
                                    <div>
                                      <input
                                        type="file"
                                        id={`file-${req.trade}`}
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={(e) => handleTradeFileUpload(req.trade, e.target.files)}
                                        className="hidden"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById(`file-${req.trade}`)?.click()}
                                        className="w-full"
                                      >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload files (PDF, images)
                                      </Button>
                                    </div>

                                    {req.files && req.files.length > 0 && (
                                      <div className="space-y-2">
                                        {req.files.map((file, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
                                          >
                                            <span className="flex-1 truncate">{file.name}</span>
                                            <div className="ml-2 flex items-center gap-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  const url = URL.createObjectURL(file);
                                                  window.open(url, '_blank');
                                                }}
                                                className="h-6 px-2 text-xs"
                                              >
                                                View
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveTradeFile(req.trade, index)}
                                                className="h-6 w-6 p-0"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex gap-2">
                                      <Input
                                        type="url"
                                        placeholder="https://drive.google.com/..."
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTradeLink(req.trade, e.currentTarget.value);
                                            e.currentTarget.value = '';
                                          }
                                        }}
                                        className="flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                          handleAddTradeLink(req.trade, input.value);
                                          input.value = '';
                                        }}
                                      >
                                        Add link
                                      </Button>
                                    </div>

                                    {req.links && req.links.length > 0 && (
                                      <div className="space-y-2">
                                        {req.links.map((link, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
                                          >
                                            <a
                                              href={link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex-1 truncate text-blue-600 hover:underline"
                                            >
                                              {link}
                                            </a>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRemoveTradeLink(req.trade, index)}
                                              className="ml-2 h-6 w-6 p-0"
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <p className="text-xs italic text-gray-500">
                                      Only visible to {req.trade}, tender owner, and admin
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                          <p className="text-sm text-gray-500">
                            No trades added yet. Select a trade and click "Add trade" to get started.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button variant="primary-red" onClick={handleNext}>
                        Continue <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-xl font-bold text-gray-900">Location & Timeline</h3>
                      <p className="mb-6 text-sm text-gray-600">Where and when will the project take place?</p>
                    </div>

                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        Only suburb and postcode will be visible to contractors. Your exact address remains private.
                      </AlertDescription>
                    </Alert>

                    <SuburbAutocomplete
                      value={suburb}
                      postcode={postcode}
                      onSuburbChange={setSuburb}
                      onPostcodeChange={setPostcode}
                      required
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="desiredStartDate">Desired Start Date</Label>
                        <Input
                          id="desiredStartDate"
                          type="text"
                          value={desiredStartDate}
                          onChange={(e) => handleDateChange('desiredStartDate', e.target.value)}
                          placeholder="dd/mm/yyyy"
                          maxLength={10}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="desiredEndDate">Desired End Date</Label>
                        <Input
                          id="desiredEndDate"
                          type="text"
                          value={desiredEndDate}
                          onChange={(e) => handleDateChange('desiredEndDate', e.target.value)}
                          placeholder="dd/mm/yyyy"
                          maxLength={10}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="closesAt">Tender closes</Label>
                      <Input id="closesAt" type="text" value={closesAtDisplay} readOnly disabled className="mt-1 bg-gray-50" />
                      <p className="mt-1 text-xs text-gray-500">
                        Auto-set based on selected tier:{' '}
                        {selectedTier ? `${getTenderDurationDays(selectedTier)} days` : '7 days (default)'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isNameHidden"
                        checked={isNameHidden}
                        onCheckedChange={(checked) => setIsNameHidden(checked as boolean)}
                      />
                      <Label htmlFor="isNameHidden" className="cursor-pointer">
                        Hide my name (show as "Verified Builder")
                      </Label>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back
                      </Button>
                      <Button variant="primary-red" onClick={handleNext}>
                        Continue <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3 (Tier selection - only if NOT subscribed) */}
                {step === 3 && !hasBuilderSubscription && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-xl font-bold text-gray-900">Select Tender Tier</h3>
                      <p className="mb-6 text-sm text-gray-600">Choose the visibility and reach for your tender</p>
                    </div>

                    <div className="grid gap-4">
                      {/* Free Trial (if allowed) */}
                      {!builderFreeTrialUsed && (
                        <Card
                          className={`cursor-pointer transition-all ${
                            selectedTier === 'FREE_TRIAL' ? 'border-gray-400 border-2 shadow-md' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedTier('FREE_TRIAL')}
                        >
                          <CardHeader className="pb-4 bg-gray-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <CardTitle className="mb-2 text-lg text-gray-800">Free Trial</CardTitle>
                                <CardDescription>15km radius, max 3 quotes per trade</CardDescription>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold leading-none text-gray-800">Free</div>
                                <div className="mt-1 text-xs text-gray-500">one-time</div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <ul className="space-y-2.5">
                              {['15km radius only', 'Maximum 3 quotes per selected trade', 'Basic visibility'].map((f) => (
                                <li key={f} className="flex items-start text-sm text-gray-600 leading-snug">
                                  <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* One-time $15 (premium-like) -> mapped to PREMIUM_14 */}
                      <Card
                        className={`cursor-pointer transition-all ${
                          selectedTier === 'PREMIUM_14'
                            ? 'border-red-500 border-2 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTier('PREMIUM_14')}
                      >
                        <CardHeader className="pb-4 bg-red-50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="mb-2 text-lg text-red-900">
                                One-time Tender
                                <Badge className="ml-2 bg-red-600">Recommended</Badge>
                              </CardTitle>
                              <CardDescription className="text-red-900/80">
                                Premium reach & visibility (one-off)
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold leading-none text-red-900">$15</div>
                              <div className="mt-1 text-xs text-red-900/70">one-time</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <ul className="space-y-2.5">
                            {['Unlimited radius', 'Unlimited quotes', 'Priority visibility', 'Email/SMS alerts to contractors'].map((f) => (
                              <li key={f} className="flex items-start text-sm text-gray-700 leading-snug">
                                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-600" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Premium subscription plan (CTA only) */}
                      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 shadow-lg">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-white text-lg mb-2">Premium Plan</CardTitle>
                          <CardDescription className="text-blue-100">
                            Post unlimited premium-style tenders with no per-tender charges
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold text-white leading-none">$30</span>
                              <span className="text-blue-100">/month</span>
                            </div>
                            <p className="text-sm text-blue-100">or $60 for 3 months</p>
                          </div>

                          <ul className="space-y-2.5">
                            {['Unlimited premium-style tenders', 'All premium features included', 'No per-tender charges'].map((f) => (
                              <li key={f} className="flex items-start text-sm text-white leading-snug">
                                <Check className="w-4 h-4 text-blue-200 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>

                          <Button
                            type="button"
                            className="mt-4 w-full bg-white text-blue-700 hover:bg-blue-50"
                            onClick={() => router.push('/pricing')}
                          >
                            View Subscription Plans
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back
                      </Button>
                      <Button variant="primary-red" onClick={handleNext} disabled={!selectedTier}>
                        Continue <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4 (or Step 3 if subscribed) */}
                {(step === 4 || (step === 3 && hasBuilderSubscription)) && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-xl font-bold text-gray-900">Review & Publish</h3>
                      <p className="mb-6 text-sm text-gray-600">Review your tender details before publishing</p>
                    </div>

                    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                      <div className="p-4">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Project</div>
                        <div className="text-sm font-medium text-gray-900">{projectName}</div>
                        {projectDescription && (
                          <div className="mt-1 line-clamp-2 text-sm text-gray-600">{projectDescription}</div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Location</div>
                        <div className="text-sm text-gray-900">
                          {suburb}, {postcode}
                        </div>
                        {isNameHidden && (
                          <Badge variant="outline" className="mt-2">
                            Builder name hidden
                          </Badge>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Required Trades</div>
                        <div className="flex flex-wrap gap-1">
                          {tradeRequirements.map((req) => (
                            <Badge key={req.trade} variant="outline">
                              {req.trade}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Tier</div>
                        <Badge className={getTierBadgeColor(selectedTier)}>
                          {getTierDisplayName(selectedTier, hasBuilderSubscription)}
                        </Badge>
                      </div>
                    </div>

                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900">
                        <p className="mb-1 font-medium">Ready to publish?</p>
                        <p>
                          Once published, your tender will be visible to contractors matching your selected trades and location criteria.
                        </p>
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBack} disabled={loading}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back
                      </Button>
                      <Button variant="primary-red" onClick={handleSubmit} size="lg" disabled={loading}>
                        {loading ? 'Publishing…' : 'Publish Tender'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <ApprovalConfirmationModal
          open={showApprovalModal}
          onOpenChange={setShowApprovalModal}
          type="tender"
          redirectPath="/tenders"
        />
      </AppLayout>
    </TradeGate>
  );
}

// --- Display helpers (UI labels only) ---
function getTierBadgeColor(tier: TenderTier | null): string {
  if (!tier) return 'bg-gray-100 text-gray-800';
  switch (tier) {
    case 'FREE_TRIAL':
      return 'bg-gray-100 text-gray-800';
    case 'PREMIUM_14':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getTierDisplayName(tier: TenderTier | null, hasSubscription: boolean): string {
  if (hasSubscription) return 'Premium Plan (Subscription)';
  if (!tier) return '';
  switch (tier) {
    case 'FREE_TRIAL':
      return 'Free Trial';
    case 'PREMIUM_14':
      return 'One-time ($15)';
    default:
      return tier;
  }
}
