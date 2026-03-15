'use client';

/*
 * QA notes — ABN gating (Tenders create):
 * - /tenders/create redirects unverified users to /verify-business (returnUrl=/tenders/create); no form flash.
 * - /tenders list and /tenders/[id] are browseable for unverified. No TradeGate in tenders flow.
 * - Publish/commit actions on tender create are gated by ABN.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { useUpgradeCheckout } from '@/lib/use-upgrade-checkout';
import { isAdmin } from '@/lib/is-admin';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { buildLoginUrl } from '@/lib/url-utils';
import { hasBuilderPremium } from '@/lib/capability-utils';
import { needsBusinessVerification, redirectToVerifyBusiness, getVerifyBusinessUrl } from '@/lib/verification-guard';
import { trackEvent } from '@/lib/analytics';

import { TRADE_CATEGORIES } from '@/lib/trades';
import { validateTradeName } from '@/lib/trade-validation';
import { getTradeIcon } from '@/lib/trade-icons';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

import { AlertCircle, ClipboardList, Crown, Info, MapPin, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';

import { TenderWizardStep } from '@/components/tenders/TenderWizardStep';
import { GenerateFromPlansModal } from '@/components/tenders/GenerateFromPlansModal';
import { RefinePillButton } from '@/components/ai/RefinePillButton';
import { formatDateShortAU } from '@/lib/date';

const MVP_FREE_MODE = process.env.NEXT_PUBLIC_MVP_FREE_MODE === 'true';

type StoredAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
  bucket: string;
};

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

function cleanAiProjectTitle(input: string) {
  let s = String(input || '').trim();

  // Remove code fences
  s = s.replace(/```[\s\S]*?```/g, '').trim();

  // Remove markdown headings and bold markers
  s = s.replace(/^#{1,6}\s*/gm, '');
  s = s.replace(/\*\*(.*?)\*\*/g, '$1').trim();

  // Remove common "tender write-up" labels
  s = s.replace(/^(tender description|project overview)\s*[:\-]?\s*/i, '').trim();

  // If multiple lines, keep the first meaningful line
  const firstLine = s
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) || '';

  s = firstLine;

  // Kill leftover separators
  s = s.replace(/^[-–—•]+\s*/g, '').trim();

  // Hard length cap (project name should be short)
  if (s.length > 90) s = s.slice(0, 90).trim();

  // Remove trailing punctuation oddities
  s = s.replace(/[.:,\-–—]+$/g, '').trim();

  return s;
}

export default function CreateTenderPage() {
  const { session, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const { handleUpgrade, isLoading: checkoutLoading } = useUpgradeCheckout('SUBCONTRACTOR_PRO_10');
  const supabase = useMemo(() => getBrowserSupabase(), []);

  const TOTAL_STEPS = 3;
  const [openStep, setOpenStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentStep = openStep === 0 ? 1 : openStep;

  const markDone = (n: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(n);
      return next;
    });
  };

  const isDone = (n: number) => completedSteps.has(n);

  const completedCount = completedSteps.size;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [builderFreeTrialUsed, setBuilderFreeTrialUsed] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [tradeRequirements, setTradeRequirements] = useState<TradeRequirement[]>([]);
  const [tradeSearch, setTradeSearch] = useState('');

  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationPlaceId, setLocationPlaceId] = useState<string | null>(null);

  // ✅ Store as YYYY-MM-DD (native date input)
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [desiredEndDate, setDesiredEndDate] = useState('');

  // ✅ Progress is based on completed steps (user clicked "Done")
  const completedStepsCount = completedSteps.size; // 0..3
  const progressPercent = Math.round((completedStepsCount / TOTAL_STEPS) * 100);

  const [isNameHidden, setIsNameHidden] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const [aiError, setAiError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isRefiningName, setIsRefiningName] = useState(false);
  const [isRefiningDescription, setIsRefiningDescription] = useState(false);
  const [aiRefining, setAiRefining] = useState(false);
  const [refiningTrade, setRefiningTrade] = useState<string | null>(null);
  const [lastAiBackup, setLastAiBackup] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [isProjectDropOver, setIsProjectDropOver] = useState(false);
  const [projectFilesBump, setProjectFilesBump] = useState(false);
  const projectFilesInputRef = useRef<HTMLInputElement | null>(null);

  const needsAbn = useMemo(() => needsBusinessVerification(currentUser), [currentUser]);
  const isAbnVerified = currentUser ? !needsBusinessVerification(currentUser) : false;
  const isAdminUser = isAdmin(currentUser);

  const isPremiumUser =
    (currentUser as any)?.isPremium ||
    (currentUser as any)?.is_premium ||
    (currentUser as any)?.subscription_status === 'active';

  async function onClickPublish() {
    if (loading) return;
    markDone(3);
    handleSubmitVerified();
  }

  const returnUrl = '/tenders/create';
  const verifyUrl = getVerifyBusinessUrl(returnUrl);
  const hasRedirectedAbn = useRef(false);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const projectFilesSectionRef = useRef<HTMLDivElement | null>(null);
  const startDateRef = useRef<HTMLInputElement | null>(null);
  const endDateRef = useRef<HTMLInputElement | null>(null);

  function openDatePicker(ref: React.RefObject<HTMLInputElement | null>) {
    const el = ref.current;
    if (!el) return;
    // Chrome / Edge
    // @ts-ignore
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  }

  // ✅ Tier is removed from UI. Default to FREE_TRIAL for now.
  const DEFAULT_TIER: TenderTier = 'FREE_TRIAL';

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

  useEffect(() => {
    if (!projectFiles?.length) return;
    setProjectFilesBump(true);
    const t = setTimeout(() => setProjectFilesBump(false), 450);
    return () => clearTimeout(t);
  }, [projectFiles?.length]);

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
        const row = data as { builder_free_trial_tender_used?: boolean | null };
        setBuilderFreeTrialUsed(!!row.builder_free_trial_tender_used);
      }
    } catch (err) {
      console.error('Error fetching builder trial status:', err);
    }
  };

  // ✅ Keep end date valid if start date changes
  useEffect(() => {
    if (desiredStartDate && desiredEndDate && desiredEndDate < desiredStartDate) {
      setDesiredEndDate('');
    }
  }, [desiredStartDate, desiredEndDate]);

  const step1Valid =
    (projectName?.trim?.() ?? '').length > 1 &&
    (projectDescription?.trim?.() ?? '').length > 1 &&
    (tradeRequirements?.length ?? 0) > 0 &&
    tradeRequirements.every(
      (req) => (req.subDescription?.trim?.() ?? '').length >= 10
    );

  const step2Valid =
    (suburb?.trim?.() ?? '').length > 1 && (postcode?.trim?.() ?? '').length > 0;

  const step3Valid = step1Valid && step2Valid;

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
  const selectedTrades = useMemo(
    () => new Set(tradeRequirements.map((r) => r.trade)),
    [tradeRequirements]
  );

  function addTrade(trade: string) {
    setTradeRequirements((prev) => {
      if (prev.some((r) => r.trade === trade)) return prev;
      return [...prev, { trade, subDescription: '' }];
    });
  }

  function removeTrade(trade: string) {
    setTradeRequirements((prev) => prev.filter((r) => r.trade !== trade));
  }

  function toggleTrade(trade: string, checked: boolean) {
    if (checked) addTrade(trade);
    else removeTrade(trade);
  }

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

  function bytesToHuman(bytes: number) {
    const b = Number(bytes || 0);
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
    const val = b / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function mergeFiles(prev: File[], incoming: File[]) {
    const map = new Map<string, File>();
    for (const f of prev) map.set(`${f.name}:${f.size}:${f.lastModified}`, f);
    for (const f of incoming) map.set(`${f.name}:${f.size}:${f.lastModified}`, f);
    return Array.from(map.values());
  }

  function handleProjectFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    setProjectFiles((prev: File[]) => mergeFiles(prev || [], incoming));
  }

  function removeProjectFileAt(index: number) {
    setProjectFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (projectFilesInputRef.current) projectFilesInputRef.current.value = '';
      return next;
    });
  }

  function clearProjectFiles() {
    setProjectFiles([]);
    if (projectFilesInputRef.current) projectFilesInputRef.current.value = '';
  }

  const projectFilesTotalBytes = useMemo(
    () => (projectFiles || []).reduce((sum, f) => sum + (f?.size ?? 0), 0),
    [projectFiles]
  );

  function slugifyTrade(s: string) {
    return String(s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function uploadFilesToTenderBucket(args: {
    tenderId: string;
    folder: string;
    files: File[];
  }) {
    const { tenderId, folder, files } = args;

    const uploaded: StoredAttachment[] = [];

    for (const file of files) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const safeExt = ext ? `.${ext}` : '';
      const unique = `${Date.now()}_${crypto.randomUUID()}${safeExt}`;

      const path = `tenders/${tenderId}/${folder}/${unique}`;

      const { error } = await supabase.storage
        .from('tender-attachments')
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (error) throw error;

      uploaded.push({
        name: file.name,
        path,
        size: file.size,
        type: file.type || 'application/octet-stream',
        bucket: 'tender-attachments',
      });
    }

    return uploaded;
  }

  // ---- AI refine ----
  async function handleAiRefineName() {
    if (!projectName?.trim()) return;

    try {
      setIsRefiningName(true);

      const res = await fetch('/api/ai/refine-tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'name',
          text: projectName.trim(),
          trade: tradeRequirements.map((r) => r.trade).join(', ') || undefined,
          location: [suburb, postcode].filter(Boolean).join(', ') || undefined,
        }),
      });

      const data = await res.json();
      const refined = cleanAiProjectTitle(String(data?.refined ?? ''));

      if (!res.ok) {
        toast.error(data?.error || 'Could not refine project name.');
        return;
      }
      if (refined) {
        setProjectName(refined);
        toast.success('Project name refined.');
      } else {
        toast.error('AI returned an invalid title. Try again.');
      }
    } catch (err) {
      console.error('[tenders] refine name failed', err);
      toast.error('Could not refine project name.');
    } finally {
      setIsRefiningName(false);
    }
  }

  function undoAiChange() {
    if (lastAiBackup == null) return;
    setProjectDescription(lastAiBackup);
    setLastAiBackup(null);
    toast.success('Undid AI change.');
  }

  function acceptAiPreview() {
    if (!aiPreview) return;
    setLastAiBackup(projectDescription);
    setProjectDescription(aiPreview);
    setAiPreview(null);
    toast.success('Description updated.');
    setTimeout(
      () => descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      50
    );
  }

  function cancelAiPreview() {
    setAiPreview(null);
  }

  async function runRefineProjectDescription() {
    const raw = String(projectDescription ?? '').trim();

    if (!raw) {
      toast.error('Add a description first, then refine with AI.');
      return;
    }

    try {
      setAiError(null);
      setIsRefiningDescription(true);

      // Backup for undo BEFORE we change anything
      setLastAiBackup(raw);

      // (Optional analytics)
      try {
        trackEvent('tender_ai_refine_project_description', {
          hasExistingText: true,
          length: raw.length,
        });
      } catch {}

      const res = await fetch('/api/ai/refine-tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'description',
          text: raw,
          trade: tradeRequirements.map((r) => r.trade).join(', ') || undefined,
          location: [suburb, postcode].filter(Boolean).join(', ') || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Could not refine description.');
        return;
      }

      const refined = String(data?.refined ?? '').trim();

      if (!refined) {
        toast.error('AI did not return a refinement. Try again.');
        return;
      }

      setAiPreview(refined);
      toast.success('Preview ready');
    } catch (e) {
      console.error('[tenders] refine failed', e);
      toast.error('Could not refine description.');
    } finally {
      setIsRefiningDescription(false);
    }
  }

  // (legacy wrapper kept for minimal code churn if referenced elsewhere)
  async function refineDescriptionWithAI() {
    return runRefineProjectDescription();
  }

  async function refineTradeWithAI(tradeName: string) {
    const current = tradeRequirements.find((r) => r.trade === tradeName);
    const raw = String(current?.subDescription ?? '').trim();

    if (!raw) {
      toast.error('Add some trade details first, then refine with AI.');
      return;
    }

    try {
      setRefiningTrade(tradeName);

      const res = await fetch('/api/ai/refine-tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: raw,
          trade: tradeName,
          location: [suburb, postcode].filter(Boolean).join(', ') || undefined,
          projectName: projectName || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || 'Could not refine trade description.');
        return;
      }

      const refined = String(data?.refined ?? '').trim();
      if (!refined) {
        toast.error('AI did not return a refinement. Try again.');
        return;
      }

      handleUpdateTradeDescription(tradeName, refined);
      toast.success(`${tradeName} refined.`);
    } catch (e) {
      console.error('[tenders] refine trade failed', e);
      toast.error('Could not refine trade description.');
    } finally {
      setRefiningTrade(null);
    }
  }

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

    const profile = userProfile as { id: string; role: string };

    // ✅ Guardrail: limit pending guest tenders (single-account: applies to non-admins)
    if (mode === 'guest' && !isAdmin(profile)) {
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
    if (mode === 'verified' && profile.role !== 'admin' && needsAbn) {
      toast.error('Verify your ABN to continue.');
      redirectToVerifyBusiness(router, returnUrl);
      return;
    }

    const tierToUse: TenderTier = DEFAULT_TIER;
    const statusToUse = mode === 'guest' ? ('PENDING_APPROVAL' as any) : ('DRAFT' as any);

    let tender: { id: string } | null = null;

    if (mode === 'verified') {
      // Verified flow: use create_tender RPC (requires ABN verification)
      const pTrades = tradeRequirements
        .map((r) => validateTradeName(r.trade))
        .filter((t): t is string => t != null);
      if (pTrades.length === 0) {
        toast.error('Please select at least 1 trade before publishing.');
        setError('At least one trade is required.');
        return;
      }

      const budgetMinCents = tradeRequirements.reduce<number | null>((acc, r) => {
        const v = r.budgetMin ? Math.round(Number(r.budgetMin) * 100) : null;
        return v != null ? (acc == null ? v : Math.min(acc, v)) : acc;
      }, null);
      const budgetMaxCents = tradeRequirements.reduce<number | null>((acc, r) => {
        const v = r.budgetMax ? Math.round(Number(r.budgetMax) * 100) : null;
        return v != null ? (acc == null ? v : Math.max(acc, v)) : acc;
      }, null);

      const createArgs = {
        p_project_name: projectName?.trim() || 'Draft tender',
        p_description: projectDescription?.trim() || '',
        p_suburb: suburb?.trim() || '',
        p_postcode: postcode?.trim() || '',
        p_budget_min_cents: budgetMinCents ?? 0,
        p_budget_max_cents: budgetMaxCents ?? 0,
        p_trades: pTrades,
        p_desired_start_date: desiredStartDate?.trim() || null,
        p_desired_end_date: desiredEndDate?.trim() || null,
        p_shared_attachments: [] as unknown,
        p_is_anonymous: isAnonymous,
        p_lat: locationLat ?? null,
        p_lng: locationLng ?? null,
      };
      const { data: rpcTender, error: rpcErr } = await supabase.rpc('create_tender', createArgs as any);

      if (rpcErr) {
        const msg = String((rpcErr as any)?.message || '');
        if (msg.includes('abn_verification_required')) {
          toast.error('Verify your ABN to create tenders.');
          redirectToVerifyBusiness(router, returnUrl);
          return;
        }
        if (msg.includes('project_name_required')) {
          toast.error('Project name is required.');
          setError('Project name is required.');
          return;
        }
        if (msg.includes('location_required')) {
          toast.error('Suburb and postcode are required.');
          setError('Suburb and postcode are required.');
          return;
        }
        if (msg.includes('trades_required')) {
          toast.error('Please select at least 1 trade before publishing.');
          setError('At least one trade is required.');
          return;
        }
        if (msg.includes('not_authenticated')) {
          setError('Authentication required. Please log in to create tenders.');
          return;
        }
        if (msg.includes('user_not_found')) {
          setError('User profile not found. Please log in with a valid contractor account.');
          return;
        }
        throw new Error(msg || 'Failed to create tender');
      }

      if (!rpcTender) throw new Error('Failed to create tender');
      tender = rpcTender as { id: string };

      // RPC creates trade rows; update with sub_description and per-trade budget
      const tenderId = tender.id;
      for (const req of tradeRequirements) {
        if (!req.trade?.trim()) continue;
        const updatePayload = {
          sub_description: req.subDescription || '',
          min_budget_cents: req.budgetMin ? Math.round(Number(req.budgetMin) * 100) : null,
          max_budget_cents: req.budgetMax ? Math.round(Number(req.budgetMax) * 100) : null,
        };
        await supabase
          .from('tender_trade_requirements')
          .update(updatePayload as never)
          .eq('tender_id', tenderId)
          .eq('trade', req.trade);
      }
    } else {
      // Guest flow: use API
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
          place_id: locationPlaceId,
          lat: locationLat,
          lng: locationLng,
          isNameHidden,
          isAnonymous,
          status: statusToUse,
          tier: tierToUse,
          tradeRequirements: tradeReqsForApi,
          projectFilesCount: projectFiles.length,
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

      tender = data.tender;
    }

    if (!tender?.id) throw new Error('Invalid response from server');

    // ---- Upload attachments (shared + per-trade) and persist ----
    try {
      // 1) Upload shared project files
      let sharedAttachments: StoredAttachment[] = [];
      if (projectFiles.length > 0) {
        sharedAttachments = await uploadFilesToTenderBucket({
          tenderId: tender.id,
          folder: 'shared',
          files: projectFiles,
        });

        const sharedPayload = { shared_attachments: sharedAttachments };
        const { error: sharedErr } = await supabase
          .from('tenders')
          .update(sharedPayload as never)
          .eq('id', tender.id);

        if (sharedErr) throw sharedErr;
      }

      // 2) Upload per-trade files (if any)
      for (const req of tradeRequirements) {
        const files = req.files || [];
        if (!files.length) continue;

        const slug = slugifyTrade(req.trade);
        const tradeAttachments = await uploadFilesToTenderBucket({
          tenderId: tender.id,
          folder: `trades/${slug}`,
          files,
        });

        const tradePayload = { attachments: tradeAttachments };
        const { error: tradeErr } = await supabase
          .from('tender_trade_requirements')
          .update(tradePayload as never)
          .eq('tender_id', tender.id)
          .eq('trade', req.trade);

        if (tradeErr) throw tradeErr;
      }
    } catch (e) {
      console.error('[tenders] attachment upload failed', e);
      toast.error('Tender created, but file upload failed. You can re-upload later.');
    }

    if (tierToUse === 'FREE_TRIAL' && !builderFreeTrialUsed) {
      const userUpdate = { builder_free_trial_tender_used: true };
      await supabase.from('users').update(userUpdate as never).eq('id', authUser.id);
    }

    // Guest flow: created as PENDING_APPROVAL, done
    if (mode === 'guest') {
      trackEvent('tender_created', tender?.id != null ? { tenderId: tender.id } : {});
      setShowApprovalModal(true);
      return;
    }

    // Verified flow: call publish_tender (validates limit, readiness, etc.)
    const publishArgs = { p_tender_id: tender.id };
    const { error: publishErr } = await supabase.rpc('publish_tender', publishArgs as any);

    if (publishErr) {
      const msg = String((publishErr as any)?.message || '');
      if (msg.includes('free_tender_monthly_limit_reached')) {
        toast.error('Free plan allows 1 tender per month. Upgrade to publish more.');
      } else if (msg.includes('trades_required')) {
        toast.error('Please select at least 1 trade before publishing.');
      } else if (msg.includes('not_ready')) {
        toast.error('Complete the required steps before publishing.');
      } else if (msg.includes('not_owner')) {
        toast.error('You can only publish your own tender.');
      } else {
        toast.error('Could not publish tender.');
      }
      return;
    }

    toast.success('Tender published');
    trackEvent('tender_created', tender?.id != null ? { tenderId: tender.id } : {});

    // Fire-and-forget: send email alerts to eligible premium users (do not block on success)
    fetch('/api/alerts/send-for-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingType: 'tender', listingId: tender.id }),
    }).catch((e) => console.warn('[tenders/create] alert send failed:', e));

    router.push(`/tenders/${tender.id}`);
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
      <AppLayout transparentBackground>
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
            aria-hidden
          />
          <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
            <img
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              aria-hidden="true"
              className="h-[1600px] w-[1600px] opacity-[0.08]"
            />
          </div>
          <div className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
          </div>
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
      <AppLayout transparentBackground>
        <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
            aria-hidden
          />
          <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
            <img
              src="/TradeHub-Mark-whiteout.svg"
              alt=""
              aria-hidden="true"
              className="h-[1600px] w-[1600px] opacity-[0.08]"
            />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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

  return (
    <AppLayout transparentBackground>
      {/* Blue wrapper (same as tenders page) */}
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

        {/* Fixed white watermark */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-whiteout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.08]"
          />
        </div>

        {/* Page content */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <PageHeader
            backLink={{ href: '/dashboard' }}
            title="Create New Tender"
            description="Post a project tender and receive quotes from qualified contractors"
            tone="dark"
          />

          {!isPremiumUser && !isAdminUser && (
            <div className="mt-4">
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-200/80">
                      <Crown className="h-5 w-5 text-amber-800" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-amber-900">
                        Generate from plans (Premium)
                      </div>

                      <div className="mt-1 text-sm text-amber-900/90">
                        Upload your drawings/PDFs and TradeHub AI will draft the tender description,
                        identify relevant trades, and suggest scope — so you can post faster.
                      </div>

                      <div className="mt-2 text-xs text-amber-900/70">
                        Best results with text-based PDFs. Scanned drawings may be limited until OCR is added.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      onClick={() => router.push('/pricing')}
                      className={[
                        'relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
                        'bg-amber-400 text-black hover:bg-amber-300',
                        'ring-2 ring-amber-300/50 shadow-[0_0_0_6px_rgba(251,191,36,0.08)]',
                        'transition-all duration-200',
                      ].join(' ')}
                    >
                      <Crown className="h-4 w-4 text-amber-800" />
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mx-auto w-full max-w-5xl">
              <div className="h-2 w-full rounded-full bg-white/25">
                <div
                  className="h-2 rounded-full bg-white/70 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-center text-xs font-medium text-white/80">
                {progressPercent}% complete
              </div>
            </div>
          </div>

          {/* Wizard steps (single page) */}
          <div className="mx-auto mt-6 w-full max-w-4xl space-y-4">
            {/* STEP 1 */}
            <TenderWizardStep
              number={1}
              icon={ClipboardList}
              title="Project"
              subtitle="Describe the project and what trades should quote."
              enabled={true}
              open={openStep === 1}
              completed={isDone(1)}
              onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
            >
                <div className="space-y-2">
                  <Label htmlFor="tender-project-name" className="text-base font-semibold text-slate-900">
                    Project name
                  </Label>
                  <Input
                    id="tender-project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder='e.g. Single storey house, Multi unit sanitary plumbing, Renovation'
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      AI rewrites your text to sound more professional (same meaning, clearer structure).
                    </p>

                    <RefinePillButton
                      size="sm"
                      variant="secondary"
                      loading={isRefiningName}
                      disabled={!String(projectName ?? '').trim()}
                      onClick={handleAiRefineName}
                      title={
                        !String(projectName ?? '').trim()
                          ? 'Add a project name first'
                          : 'Refine your existing text (does not invent scope)'
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900">
                    Project description
                  </Label>

                  <Textarea
                    ref={descriptionRef}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Give an overview, what’s included/excluded, site access, timing, expectations, etc."
                    rows={6}
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      AI rewrites your text to sound more professional (same meaning, clearer structure).
                    </p>

                    <div className="flex items-center gap-2">
                      {lastAiBackup != null && (
                        <button
                          type="button"
                          onClick={undoAiChange}
                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                          title="Undo the last AI change"
                        >
                          Undo
                        </button>
                      )}

                      <RefinePillButton
                        size="sm"
                        variant="secondary"
                        loading={isRefiningDescription}
                        disabled={!String(projectDescription ?? '').trim() || aiPreview != null}
                        onClick={runRefineProjectDescription}
                        title={
                          aiPreview != null
                            ? 'Accept or cancel the preview first'
                            : !String(projectDescription ?? '').trim()
                            ? 'Add a project description first'
                            : 'Refine your existing text (does not invent scope)'
                        }
                      />
                    </div>
                  </div>

                  {aiError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{aiError}</AlertDescription>
                    </Alert>
                  )}

                  {aiPreview && (
                    <div className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                      <div className="text-sm font-semibold text-blue-900">AI Preview</div>

                      <div className="whitespace-pre-wrap text-sm text-slate-800">
                        {aiPreview}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={cancelAiPreview}>
                          Cancel
                        </Button>

                        <Button type="button" size="sm" onClick={acceptAiPreview}>
                          Accept
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project files (shared) */}
                <div ref={projectFilesSectionRef} className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900">
                    Project files (shared)
                  </Label>

                  <div
                    className={[
                      'rounded-xl border p-3 transition-all',
                      isProjectDropOver
                        ? 'border-blue-400 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 bg-white/70 hover:border-blue-300 hover:bg-blue-50/30',
                    ].join(' ')}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsProjectDropOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsProjectDropOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsProjectDropOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsProjectDropOver(false);

                      const dt = e.dataTransfer;
                      if (!dt?.files?.length) return;
                      handleProjectFilesSelected(dt.files);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Info className="h-4 w-4 text-slate-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-700">
                          Upload plans / documents once here.{' '}
                          <span className="font-semibold text-slate-900">
                            All invited trades can view these files.
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          {/* Hidden input */}
                          <input
                            ref={projectFilesInputRef}
                            type="file"
                            multiple
                            onChange={(e) => handleProjectFilesSelected(e.target.files)}
                            className="hidden"
                          />

                          {/* Clickable button */}
                          <button
                            type="button"
                            onClick={() => projectFilesInputRef.current?.click()}
                            className="
                              inline-flex items-center gap-2
                              rounded-xl
                              border border-slate-300
                              bg-white
                              px-4 py-2
                              text-sm font-medium text-slate-700
                              shadow-sm
                              transition-all
                              hover:border-blue-500
                              hover:bg-blue-50
                              hover:text-blue-700
                              hover:shadow-md
                              active:scale-[0.98]
                            "
                            title="Choose files"
                          >
                            <Upload className="h-4 w-4" />
                            Choose files
                          </button>

                        </div>

                        {/* File count, size, and Clear all */}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="text-xs text-muted-foreground">
                            {projectFiles.length > 0 ? (
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={[
                                    'rounded-full border bg-white/70 px-2 py-0.5 font-medium transition-all',
                                    projectFilesBump ? 'scale-[1.03] shadow-sm' : '',
                                  ].join(' ')}
                                >
                                  {projectFiles.length} file{projectFiles.length === 1 ? '' : 's'} •{' '}
                                  {bytesToHuman(projectFilesTotalBytes)}
                                </span>
                              </span>
                            ) : (
                              <span>No files selected</span>
                            )}
                          </div>

                          {projectFiles.length > 0 && (
                            <button
                              type="button"
                              onClick={clearProjectFiles}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        <div className="mt-4 mb-4">
                            <button
                              type="button"
                              disabled={!currentUser || !hasBuilderPremium(currentUser) || projectFiles.length === 0}
                              onClick={() => setShowPlansModal(true)}
                              className="
                                inline-flex items-center gap-2 rounded-xl px-4 py-2.5
                                bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500
                                text-white font-semibold shadow-md
                                hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] hover:-translate-y-[1px]
                                transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0
                              "
                            >
                              <Sparkles className="h-4 w-4" />
                              <span>Generate from plans</span>
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                                Premium
                              </span>
                            </button>
                            <p className="mt-1 text-xs text-slate-500">
                              TradeHub AI reads your plans and generates a draft tender including suggested trades and scopes.
                            </p>
                            {currentUser && !hasBuilderPremium(currentUser) && (
                              <div className="mt-2 text-xs text-slate-500">
                                <span className="font-medium text-slate-700">
                                  Premium feature:
                                </span>{' '}
                                Generate a tender directly from your uploaded plans. TradeHub AI will
                                identify relevant trades and draft the project scope automatically.
                                {' '}
                                <button
                                  type="button"
                                  className="font-semibold underline hover:text-slate-900"
                                  onClick={() => router.push('/pricing')}
                                >
                                  Upgrade to Premium
                                </button>
                              </div>
                            )}
                          </div>

                        {/* Full file list with remove buttons */}
                        <div className="mt-2 flex flex-col gap-2">
                          {projectFiles.map((f, idx) => (
                            <div
                              key={`${f?.name}-${idx}`}
                              className="flex items-center justify-between gap-3 rounded-lg border bg-white/70 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium">{f.name}</div>
                                <div className="text-xs text-muted-foreground">{bytesToHuman(f.size ?? 0)}</div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeProjectFileAt(idx)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white hover:bg-slate-50"
                                aria-label="Remove file"
                                title="Remove"
                              >
                                <X className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          Tip: You can also drag & drop files onto this box.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-slate-900">
                    Required trades
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between sm:w-[360px]"
                        >
                          {tradeRequirements.length > 0
                            ? `${tradeRequirements.length} trade${tradeRequirements.length === 1 ? '' : 's'} selected`
                            : 'Select required trades'}
                          <span className="ml-2 text-slate-500">▾</span>
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent className="w-[360px] p-3" align="start">
                        <div className="mb-2 text-sm font-semibold text-slate-900">
                          Required trades
                        </div>

                        <Input
                          placeholder="Search trades…"
                          value={tradeSearch}
                          onChange={(e) => setTradeSearch(e.target.value)}
                          className="mb-2"
                        />

                        <ScrollArea className="h-[260px] pr-2">
                          <div className="space-y-1">
                            {TRADE_CATEGORIES
                              .filter((t) =>
                                String(t).toLowerCase().includes(String(tradeSearch).toLowerCase().trim())
                              )
                              .map((trade) => {
                                const checked = selectedTrades.has(trade);
                                return (
                                  <label
                                    key={trade}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => toggleTrade(trade, Boolean(v))}
                                    />
                                    <span className="text-sm text-slate-900">{trade}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </ScrollArea>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>Tick trades to add cards instantly.</span>
                          {tradeRequirements.length > 0 && (
                            <button
                              type="button"
                              className="font-semibold text-slate-700 hover:text-slate-900"
                              onClick={() => setTradeRequirements([])}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="text-sm text-muted-foreground">
                      {tradeRequirements.length === 0 ? 'Add at least one required trade.' : null}
                    </div>
                  </div>

                  {tradeRequirements.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {tradeRequirements.map((req) => (
                        <Card
                          key={req.trade}
                          className="border-slate-200 bg-slate-50/60 shadow-sm"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  {(() => {
                                    const TradeIcon = getTradeIcon(req.trade);
                                    return TradeIcon ? <TradeIcon className="h-4 w-4 text-slate-700" /> : null;
                                  })()}
                                  <span>{req.trade}</span>
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Add trade-specific details so quotes are accurate.
                                </CardDescription>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTrade(req.trade)}
                                title="Remove trade"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <Label className="text-sm font-medium text-slate-900">Trade details</Label>
                            </div>

                            <Textarea
                              value={req.subDescription}
                              onChange={(e) => handleUpdateTradeDescription(req.trade, e.target.value)}
                              placeholder={getTradePlaceholder(req.trade)}
                              rows={4}
                            />

                            <div className="mt-3 flex items-center justify-end">
                              <RefinePillButton
                                size="sm"
                                variant="secondary"
                                loading={refiningTrade === req.trade}
                                disabled={refiningTrade === req.trade || !String(req.subDescription ?? '').trim()}
                                onClick={() => refineTradeWithAI(req.trade)}
                                title="Rewrite to sound professional (same meaning, clearer scope)"
                              />
                            </div>

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

                            {projectFiles.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-900">Shared project files</Label>
                                <div className="flex flex-wrap gap-2">
                                  {projectFiles.map((f, idx) => (
                                    <Badge key={`${req.trade}-shared-${idx}`} variant="outline" className="max-w-[260px] truncate">
                                      {f.name}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="text-xs text-slate-500">
                                  These files are visible to all selected trades.
                                </div>
                              </div>
                            )}

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

                <div className="pt-2">
                  <div className="text-sm text-muted-foreground mb-4">
                    <Info className="mr-1 inline h-4 w-4" />
                    Tip: Be specific (scope, finishes, exclusions) to get better quotes.
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!step1Valid}
                    onClick={() => {
                      if (!step1Valid) return;
                      markDone(1);
                      setOpenStep(2);
                    }}
                  >
                    Done
                  </button>
                </div>
            </TenderWizardStep>

            {/* STEP 2 */}
            <TenderWizardStep
              number={2}
              icon={MapPin}
              title="Location"
              subtitle="Set where the work is located so relevant trades can find it."
              enabled={isDone(1)}
              open={openStep === 2}
              completed={isDone(2)}
              onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
            >
                <div className="space-y-5">
                <SuburbAutocomplete
                  value={suburb}
                  postcode={postcode}
                  onSuburbChange={setSuburb}
                  onPostcodeChange={setPostcode}
                  onLatLngChange={(lat, lng) => {
                    setLocationLat(lat);
                    setLocationLng(lng);
                  }}
                  onPlaceIdChange={setLocationPlaceId}
                  required
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <Label>Desired start date (optional)</Label>

                    <div className="relative">
                      {/* Visible "fake" field */}
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 pr-11 text-sm">
                        {desiredStartDate ? (
                          <span className="text-slate-900">{formatDateShortAU(desiredStartDate)}</span>
                        ) : (
                          <span className="text-muted-foreground">Select date</span>
                        )}
                      </div>

                      {/* Real date input (kept tiny but focusable) */}
                      <input
                        ref={startDateRef}
                        type="date"
                        value={desiredStartDate}
                        onChange={(e) => setDesiredStartDate(e.target.value)}
                        className="absolute left-0 top-0 h-10 w-[1px] opacity-0"
                        aria-label="Desired start date"
                      />

                      {/* Clickable square calendar button */}
                      <button
                        type="button"
                        onClick={() => openDatePicker(startDateRef)}
                        className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98]"
                        aria-label="Open start date picker"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-4 w-4"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 2v3M16 2v3M3 9h18M5 6h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                        </svg>
                      </button>

                      {/* Also make the whole field clickable */}
                      <button
                        type="button"
                        onClick={() => openDatePicker(startDateRef)}
                        className="absolute inset-0 rounded-md"
                        aria-label="Open start date picker"
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <Label>Desired end date (optional)</Label>

                    <div className="relative">
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 pr-11 text-sm">
                        {desiredEndDate ? (
                          <span className="text-slate-900">{formatDateShortAU(desiredEndDate)}</span>
                        ) : (
                          <span className="text-muted-foreground">Select date</span>
                        )}
                      </div>

                      <input
                        ref={endDateRef}
                        type="date"
                        value={desiredEndDate}
                        min={desiredStartDate || undefined}
                        onChange={(e) => setDesiredEndDate(e.target.value)}
                        className="absolute left-0 top-0 h-10 w-[1px] opacity-0"
                        aria-label="Desired end date"
                      />

                      <button
                        type="button"
                        onClick={() => openDatePicker(endDateRef)}
                        className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98]"
                        aria-label="Open end date picker"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-4 w-4"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 2v3M16 2v3M3 9h18M5 6h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDatePicker(endDateRef)}
                        className="absolute inset-0 rounded-md"
                        aria-label="Open end date picker"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isNameHidden} onCheckedChange={(v) => setIsNameHidden(Boolean(v))} />
                    <div>
                      <div className="text-sm font-medium">Hide business name until engagement</div>
                    <div className="text-sm text-muted-foreground">Your profile will show as “Builder (hidden)”.</div>
                  </div>
                </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isAnonymous}
                      onCheckedChange={(v) => setIsAnonymous(Boolean(v))}
                      disabled={isNameHidden}
                    />
                    <div>
                      <div className="text-sm font-medium">Post as anonymous</div>
                      <div className="text-sm text-muted-foreground">
                        No avatar or name shown. Viewers must request to quote; you approve each request.
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                    onClick={() => setOpenStep(1)}
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!step2Valid}
                    onClick={() => {
                      if (!step2Valid) return;
                      markDone(2);
                      setOpenStep(3);
                    }}
                  >
                    Done
                  </button>
                </div>
            </TenderWizardStep>

            {/* STEP 3 */}
            <TenderWizardStep
              number={3}
              icon={ShieldCheck}
              title="Review"
              subtitle="Confirm your details, then publish your tender."
              enabled={isDone(1) && isDone(2)}
              open={openStep === 3}
              completed={isDone(3)}
              onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
            >
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

                  <div className="mt-3 text-sm text-muted-foreground">Visibility</div>
                  <div className="font-medium">
                    {isAnonymous ? 'Anonymous (request to quote)' : isNameHidden ? 'Name hidden' : 'Shown'}
                  </div>

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

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setOpenStep(2)}>
                      ← Back
                    </Button>

                    <div className="flex items-center gap-2">
                      {!isAdminUser && !isAbnVerified ? (
                        <Button onClick={() => router.push(verifyUrl)} disabled={loading}>
                          Verify business to publish
                        </Button>
                      ) : (
                        <Button onClick={onClickPublish} disabled={loading || !step3Valid}>
                          {loading ? 'Publishing…' : 'Publish tender'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {!isAdminUser && !isAbnVerified && (
                  <div className="text-sm text-muted-foreground">
                    Guest tenders stay pending until reviewed and won’t appear in the public tenders list until approved.
                  </div>
                )}
            </TenderWizardStep>
          </div>
        </div>
      </div>

      <ApprovalConfirmationModal
        open={showApprovalModal}
        onOpenChange={setShowApprovalModal}
        type="tender"
        redirectPath="/tenders"
      />

      <GenerateFromPlansModal
        open={showPlansModal}
        onOpenChange={setShowPlansModal}
        files={projectFiles}
        existingSuburb={suburb}
        existingPostcode={postcode}
        onApply={(draft) => {
          if (draft.project_name?.trim()) {
            setProjectName(cleanAiProjectTitle(draft.project_name));
          }
          const loc = draft.detected_location;
          if (loc && (loc.suburb || loc.address_text)) {
            const suburbVal = loc.suburb?.trim() || (() => {
              const addr = loc.address_text?.trim() || '';
              const afterComma = addr.split(',').pop()?.trim();
              return afterComma && afterComma.length < 50 ? afterComma : addr;
            })();
            if (suburbVal) setSuburb(suburbVal);
            if (loc.postcode?.trim()) setPostcode(loc.postcode.trim());
          }
          const applied = draft as { geocoded_lat?: number | null; geocoded_lng?: number | null };
          if (typeof applied.geocoded_lat === 'number' && typeof applied.geocoded_lng === 'number') {
            setLocationLat(applied.geocoded_lat);
            setLocationLng(applied.geocoded_lng);
          }
          const descParts = [
            draft.project_description?.trim() || draft.summary?.trim() || null,
            draft.inclusions?.length ? `Inclusions:\n• ${draft.inclusions.join('\n• ')}` : null,
            draft.exclusions?.length ? `Exclusions:\n• ${draft.exclusions.join('\n• ')}` : null,
            draft.timing_notes?.length ? `Timing:\n• ${draft.timing_notes.join('\n• ')}` : null,
            draft.site_access_notes?.length ? `Site access:\n• ${draft.site_access_notes.join('\n• ')}` : null,
            draft.questions_to_confirm?.length
              ? `Questions to confirm:\n• ${draft.questions_to_confirm.join('\n• ')}`
              : null,
          ].filter(Boolean);
          if (descParts.length > 0) {
            setProjectDescription(descParts.join('\n\n'));
          }
          if (draft.suggested_trades_with_scope?.length) {
            const valid = draft.suggested_trades_with_scope
              .map((t) => {
                const canonical = validateTradeName(t.trade);
                return canonical ? { trade: canonical, subDescription: t.scope?.trim() || '' } : null;
              })
              .filter((r): r is { trade: string; subDescription: string } => r !== null);
            if (valid.length > 0) setTradeRequirements(valid);
          } else if (draft.suggested_trades?.length) {
            const valid = draft.suggested_trades
              .map((t) => {
                const canonical = validateTradeName(t);
                return canonical ? { trade: canonical, subDescription: (draft.trade_scopes?.[t] ?? []).join('. ').trim() || '' } : null;
              })
              .filter((r): r is { trade: string; subDescription: string } => r !== null);
            if (valid.length > 0) setTradeRequirements(valid);
          }
        }}
      />
    </AppLayout>
  );
}
