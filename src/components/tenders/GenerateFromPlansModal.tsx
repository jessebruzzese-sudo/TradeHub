'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { validateTradeName } from '@/lib/trade-validation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type SuggestedTradeWithScope = {
  trade: string;
  scope: string;
  confidence?: number;
  evidence?: string[];
};

type DetectedLocation = {
  address_text?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  state?: string | null;
  confidence?: number;
};

/** Applied draft may include geocoded coords when we had suburb/postcode */
type AppliedDraft = Draft & {
  geocoded_lat?: number | null;
  geocoded_lng?: number | null;
};

type Draft = {
  project_name?: string;
  summary?: string;
  project_description?: string;
  suggested_trades?: string[];
  suggested_trades_with_scope?: SuggestedTradeWithScope[];
  confirmed_from_plans?: string[];
  questions_to_confirm?: string[];
  assumptions?: string[];
  inclusions?: string[];
  exclusions?: string[];
  timing_notes?: string[];
  site_access_notes?: string[];
  trade_scopes?: Record<string, string[]>;
  quantities_and_schedules?: string[];
  quote_checklist?: Record<string, string[]>;
  estimated_duration_days?: number | null;
  notes?: string | null;
  detected_location?: DetectedLocation | null;
  detected_rooms?: { bathrooms: number; ensuites: number; laundries: number; kitchens: number; wc: number; powder_rooms: number } | null;
  plan_summary?: { summaryItems: string[] } | null;
  plan_confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  detected_signals?: string[] | null;
  detected_dwelling_count?: number | null;
  detected_dwelling_labels?: string[] | null;
  likely_storey_label?: 'single storey' | 'double storey' | 'triple storey' | 'mixed/uncertain' | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** For edit flow: tender has shared_attachments */
  tenderId?: string;
  /** For create flow: files before tender exists */
  files?: File[];
  onApply: (draft: AppliedDraft) => void;
  /** Current suburb/postcode – used to show overwrite confirmation when applying detected location */
  existingSuburb?: string;
  existingPostcode?: string;
};

function isWeakPlanNote(notes: string | null | undefined): boolean {
  if (!notes || typeof notes !== 'string') return false;
  const n = notes.toLowerCase();
  return n.includes('plan text was limited') || n.includes('best-effort');
}

function getScopeForTrade(draft: Draft, trade: string): string | null {
  const withScope = draft.suggested_trades_with_scope?.find(
    (t) => t.trade === trade
  );
  if (withScope?.scope?.trim()) return withScope.scope.trim();

  const scopes = draft.trade_scopes?.[trade];
  if (Array.isArray(scopes) && scopes.length > 0) {
    return scopes.join('. ');
  }
  return null;
}

function getConfidenceLabel(confidence?: number): 'High' | 'Medium' | 'Low' {
  const c = confidence ?? 0.5;
  if (c >= 0.8) return 'High';
  if (c >= 0.5) return 'Medium';
  return 'Low';
}

function getConfidenceStyles(label: 'High' | 'Medium' | 'Low'): { dot: string; text: string } {
  switch (label) {
    case 'High':
      return { dot: 'bg-emerald-500', text: 'text-emerald-700' };
    case 'Medium':
      return { dot: 'bg-amber-500', text: 'text-amber-700' };
    case 'Low':
      return { dot: 'bg-slate-400', text: 'text-slate-600' };
  }
}

function formatDetectedLocation(loc: DetectedLocation): string {
  if (loc.address_text?.trim()) {
    const addr = loc.address_text.trim();
    if (loc.suburb?.trim() && !addr.toLowerCase().includes(loc.suburb.toLowerCase())) {
      return `${addr} – ${loc.suburb}${loc.postcode ? ` ${loc.postcode}` : ''}`;
    }
    return addr;
  }
  if (loc.suburb?.trim()) {
    const sub = loc.suburb.trim();
    const statePost = [loc.state?.trim(), loc.postcode?.trim()].filter(Boolean).join(' ');
    return statePost ? `${sub}, ${statePost}` : sub;
  }
  return '';
}

export function GenerateFromPlansModal({
  open,
  onOpenChange,
  tenderId,
  files,
  onApply,
  existingSuburb = '',
  existingPostcode = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);

  const REQUEST_TIMEOUT_MS = 45_000;

  const LOADING_STATUSES = [
    'Analysing plans…',
    'Detecting rooms…',
    'Identifying trades…',
    'Building draft…',
  ];

  const [editedProjectName, setEditedProjectName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [editedScopes, setEditedScopes] = useState<Record<string, string>>({});
  const [editingScopeFor, setEditingScopeFor] = useState<string | null>(null);

  const hasInput = (files?.length ?? 0) > 0 || !!tenderId;

  const initReviewState = useCallback((d: Draft) => {
    setEditedProjectName(d.project_name?.trim() ?? '');
    setEditedDescription((d.project_description ?? d.summary ?? '').trim());
    const trades = d.suggested_trades_with_scope?.length
      ? d.suggested_trades_with_scope
      : (d.suggested_trades ?? []).map((t) => ({ trade: t, scope: getScopeForTrade(d, t) ?? '' }));
    const tradeNames = trades.map((t) => t.trade);
    setSelectedTrades(new Set(tradeNames));
    const scopes: Record<string, string> = {};
    for (const t of trades) {
      scopes[t.trade] = t.scope ?? '';
    }
    setEditedScopes(scopes);
    setEditingScopeFor(null);
  }, []);

  async function generate() {
    const fileCount = files?.length ?? 0;
    console.log('[generate-from-plans] clicked generate', {
      fileCount,
      hasFiles: !!files?.length,
      tenderId,
      loading,
    });

    if (!hasInput) {
      console.log('[generate-from-plans] early return: no input');
      return;
    }

    setError(null);
    setLoading(true);
    setDraft(null);
    setLoadingStatusIndex(0);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let res: Response;

      if (tenderId) {
        console.log('[generate-from-plans] calling plan-draft API', { tenderId });
        res = await fetch(`/api/tenders/${tenderId}/plan-draft`, {
          method: 'POST',
          signal: controller.signal,
        });
      } else if (files?.length) {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        console.log('[generate-from-plans] calling plan-draft-from-files', {
          fileCount: files.length,
          files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        });
        res = await fetch('/api/ai/plan-draft-from-files', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } else {
        console.log('[generate-from-plans] early return: no files');
        setLoading(false);
        return;
      }

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = json?.error || `Request failed (${res.status})`;
        console.error('[generate-from-plans] API error', { status: res.status, json });
        throw new Error(errMsg);
      }

      const d = json.draft;
      if (!d) {
        console.error('[generate-from-plans] no draft in response', json);
        throw new Error('No draft in response');
      }

      console.log('[generate-from-plans] success', { project_name: d.project_name });
      setDraft(d);
      initReviewState(d);
      toast.success('Draft generated');
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.name === 'AbortError'
            ? 'Generation took too long. Please try again.'
            : e.message
          : 'Failed to generate draft';
      console.error('[generate-from-plans] failed', e);
      setError(message);
      toast.error(message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && tenderId) generate();
  }, [open, tenderId]);

  useEffect(() => {
    if (open) {
      setError(null);
      setDraft(null);
      if (!tenderId) setLoading(false);
    }
  }, [open, tenderId]);

  useEffect(() => {
    if (!loading) return;
    setLoadingStatusIndex(0);
    const id = setInterval(() => {
      setLoadingStatusIndex((i) => (i + 1) % LOADING_STATUSES.length);
    }, 1200);
    return () => clearInterval(id);
  }, [loading]);

  type TradeDisplayItem = { trade: string; scope: string; confidence?: number; evidence?: string[] };
  const rawTradesWithScope = draft?.suggested_trades_with_scope?.length
    ? draft.suggested_trades_with_scope
    : (draft?.suggested_trades ?? []).map((trade) => ({
        trade,
        scope: draft ? getScopeForTrade(draft, trade) ?? '' : '',
        confidence: undefined,
        evidence: undefined,
      }));
  const tradesToShow: TradeDisplayItem[] = rawTradesWithScope.flatMap((t) => {
    const canonical = validateTradeName(t.trade);
    return canonical ? [{ trade: canonical, scope: t.scope ?? '', confidence: t.confidence, evidence: t.evidence }] : [];
  });

  const dwellingCount = draft?.detected_dwelling_count ?? 0;
  const likelyStoreyLabel = draft?.likely_storey_label;
  const isMultiDwelling = dwellingCount >= 2;
  const storeyKnown = likelyStoreyLabel && likelyStoreyLabel !== 'mixed/uncertain';
  const rawSummaryItems = draft?.plan_summary?.summaryItems ?? [];
  const summaryItems =
    isMultiDwelling && !storeyKnown
      ? rawSummaryItems.filter((i) => !/single\s*[- ]?storey\s*dwelling(s)?/i.test(i.trim()))
      : rawSummaryItems;
  const planConfidence = draft?.plan_confidence ?? null;
  const detectedSignals = draft?.detected_signals ?? [];

  const selectedCount = tradesToShow.filter((t) => selectedTrades.has(t.trade)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate tender from plans</DialogTitle>
        </DialogHeader>

        {!draft && !loading && !hasInput && (
          <p className="text-sm text-slate-600">
            Upload plans or attach files to this tender first.
          </p>
        )}

        {!draft && !loading && hasInput && !tenderId && !error && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-700">
              TradeHub will analyse your plans and generate:
            </p>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-slate-400">•</span>
                Suggested trades
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-400">•</span>
                Scope of work
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-400">•</span>
                Draft tender description
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              {files?.length ?? 0} file(s) ready
            </p>
            <Button onClick={generate} disabled={loading}>
              Generate
            </Button>
          </div>
        )}

        {error && !loading && (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">Could not generate draft from these plans.</p>
              <p className="mt-1 text-sm text-red-800">{error}</p>
              <p className="mt-2 text-xs text-red-700">Please try again or upload different files.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setError(null); generate(); }}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => { setError(null); onOpenChange(false); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Generating from plans…</div>
            <div className="text-sm text-slate-600 transition-opacity duration-300">
              {LOADING_STATUSES[loadingStatusIndex]}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${((loadingStatusIndex + 1) / LOADING_STATUSES.length) * 90}%` }}
              />
            </div>
          </div>
        )}

        {!loading && draft && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-1 font-semibold">Project name</div>
              <Input
                value={editedProjectName}
                onChange={(e) => setEditedProjectName(e.target.value)}
                placeholder="Project name"
                className="text-slate-800"
              />
            </div>

            {draft.detected_location && (draft.detected_location.suburb || draft.detected_location.address_text) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-1 text-xs font-medium text-slate-600">Detected location</div>
                <div className="text-slate-800">
                  {formatDetectedLocation(draft.detected_location)}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1 font-semibold">Description</div>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Project description"
                rows={4}
                className="resize-y text-slate-800"
              />
            </div>

            {(summaryItems.length > 0 || planConfidence || isMultiDwelling) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">TradeHub analysed your plans.</span>
                  {planConfidence && (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      planConfidence === 'HIGH' ? 'bg-emerald-100 text-emerald-800' :
                      planConfidence === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      Confidence: {planConfidence.charAt(0) + planConfidence.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
                {isMultiDwelling && (
                  <div className="mb-2 rounded border border-slate-200 bg-white/60 px-2.5 py-1.5 text-xs text-slate-700">
                    {storeyKnown
                      ? `Detected: ${dwellingCount} ${likelyStoreyLabel === 'double storey' ? 'double-storey' : likelyStoreyLabel === 'triple storey' ? 'triple-storey' : 'single-storey'} dwellings`
                      : `Detected: ${dwellingCount} dwellings`}
                  </div>
                )}
                {summaryItems.length > 0 && (
                  <>
                    <div className="mb-1 text-xs font-medium text-slate-600">Detected from plans:</div>
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                      {summaryItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-0.5">
                          <span className="text-slate-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {detectedSignals.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                <div className="mb-1 text-xs font-medium text-slate-600">Detected signals:</div>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-700">
                  {detectedSignals.map((sig, i) => (
                    <li key={i} className="flex items-center gap-0.5">
                      <span className="text-slate-400">•</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tradesToShow.length > 0 && (
              <div>
                <div className="mb-2 font-semibold">Suggested trades</div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Trades to apply: {selectedCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTrades(new Set(tradesToShow.map((t) => t.trade)))}
                      className="text-xs text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTrades(new Set())}
                      className="text-xs text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <p className="mb-2 text-xs text-slate-500">Uncheck trades you don&apos;t want to apply. Edit scope as needed.</p>
                <div className="space-y-3">
                  {tradesToShow.map((item) => {
                    const isSelected = selectedTrades.has(item.trade);
                    const scopeText = editedScopes[item.trade] ?? item.scope;
                    const originalScope = (item.scope ?? '').trim();
                    const currentScope = (scopeText ?? '').trim();
                    const isScopeEdited = currentScope !== originalScope;
                    const isEditingScope = editingScopeFor === item.trade;
                    const evidence =
                      Array.isArray(item.evidence) && item.evidence.length > 0
                        ? item.evidence
                        : null;
                    const confidenceLabel = getConfidenceLabel(item.confidence);
                    const styles = getConfidenceStyles(confidenceLabel);
                    return (
                      <div
                        key={item.trade}
                        className={`rounded-lg border p-3 transition-colors ${
                          isScopeEdited
                            ? isSelected
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-amber-100 bg-amber-50/50 opacity-75'
                            : isSelected
                              ? 'border-slate-200 bg-slate-50'
                              : 'border-slate-100 bg-slate-50/50 opacity-75'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id={`trade-${item.trade}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              setSelectedTrades((prev) => {
                                const next = new Set(prev);
                                if (checked === true) next.add(item.trade);
                                else next.delete(item.trade);
                                return next;
                              });
                            }}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <label htmlFor={`trade-${item.trade}`} className="font-medium text-slate-900 cursor-pointer">
                                {item.trade}
                              </label>
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
                                <span className={`text-xs font-medium ${styles.text}`}>
                                  {confidenceLabel} confidence
                                </span>
                              </span>
                              {isScopeEdited && (
                                <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                                  Edited
                                </span>
                              )}
                            </div>
                            {isEditingScope ? (
                              <div className="mt-2">
                                <Textarea
                                  value={scopeText}
                                  onChange={(e) =>
                                    setEditedScopes((prev) => ({ ...prev, [item.trade]: e.target.value }))
                                  }
                                  rows={3}
                                  className="text-sm resize-y"
                                  autoFocus
                                  onBlur={() => setEditingScopeFor(null)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-7 text-xs"
                                  onClick={() => setEditingScopeFor(null)}
                                >
                                  Done
                                </Button>
                              </div>
                            ) : (
                              <>
                                {scopeText ? (
                                  <p className="mt-1 text-slate-700">{scopeText}</p>
                                ) : (
                                  <p className="mt-1 text-xs text-slate-500">No scope detected</p>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-7 text-xs text-slate-600"
                                  onClick={() => setEditingScopeFor(item.trade)}
                                >
                                  Edit scope
                                </Button>
                              </>
                            )}
                            {evidence && (
                              <p className="mt-1.5 text-xs text-slate-500">
                                Evidence: {evidence.slice(0, 5).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {draft.notes && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                <div className="text-xs font-medium text-blue-900">
                  {isWeakPlanNote(draft.notes) ? 'About this draft' : 'Note'}
                </div>
                <div className="mt-1 text-sm text-blue-800">
                  {isWeakPlanNote(draft.notes) ? (
                    <>
                      Plan text was limited, so this draft is a best-effort result.
                      <span className="mt-1.5 block text-blue-700">
                        For stronger results, upload clearer PDFs or image exports of plans.
                      </span>
                    </>
                  ) : (
                    draft.notes
                  )}
                </div>
              </div>
            )}

            {draft.quantities_and_schedules?.length ? (
              <div className="rounded-xl border bg-white/70 p-4">
                <div className="font-semibold text-slate-900">
                  Quantities & schedules
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                  {draft.quantities_and_schedules.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {draft.quote_checklist && Object.keys(draft.quote_checklist).length ? (
              <div className="rounded-xl border bg-white/70 p-4">
                <div className="font-semibold text-slate-900">Quote checklist</div>
                <div className="mt-3 space-y-3">
                  {Object.entries(draft.quote_checklist)
                    .filter(([trade]) => validateTradeName(trade))
                    .map(([trade, items]) => {
                      const canonical = validateTradeName(trade)!;
                      return (
                    <div key={canonical} className="rounded-lg border bg-slate-50 p-3">
                      <div className="font-medium text-slate-900">{canonical}</div>
                      {items?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                          {items.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-1 text-xs text-slate-500">
                          No checklist items.
                        </div>
                      )}
                    </div>
                  );
                    })}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={selectedCount === 0}
                onClick={() => {
                  if (draft && selectedCount > 0) setConfirmApplyOpen(true);
                }}
              >
                {selectedCount === 0
                  ? 'Apply 0 Trades'
                  : `Apply ${selectedCount} Trade${selectedCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply generated draft?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const hasDetected = draft?.detected_location && (draft.detected_location.suburb || draft.detected_location.address_text);
                const hasExisting = (existingSuburb?.trim() || existingPostcode?.trim()) ? true : false;
                const base = 'This will populate the tender form with the project name, description, and suggested trades. Existing project text and trade selections will be replaced. Uploaded files will not be changed.';
                if (hasDetected) {
                  if (hasExisting) {
                    return `${base} Detected location will fill the Location section. Your existing location fields will be replaced.`;
                  }
                  return `${base} Detected location will also fill the Location section.`;
                }
                return `${base} Location will not be changed.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const d = draft;
                if (d) {
                  const selected = Array.from(selectedTrades);
                  const tradesToApply = (d.suggested_trades_with_scope ?? []).filter((t) =>
                    selected.includes(t.trade)
                  );
                  const fallbackTrades = (d.suggested_trades ?? []).filter((t) =>
                    selected.includes(t)
                  );
                  const appliedTrades = tradesToApply.length
                    ? tradesToApply.map((t) => ({
                        trade: t.trade,
                        scope: (editedScopes[t.trade] ?? t.scope ?? '').trim(),
                        confidence: t.confidence,
                        evidence: t.evidence,
                      }))
                    : fallbackTrades.map((t) => ({
                        trade: t,
                        scope: (editedScopes[t] ?? getScopeForTrade(d, t) ?? '').trim(),
                      }));

                  let geocodedLat: number | null = null;
                  let geocodedLng: number | null = null;
                  const loc = d.detected_location;
                  if (loc && (loc.suburb?.trim() || loc.postcode?.trim())) {
                    const addr = [loc.suburb?.trim(), loc.postcode?.trim()].filter(Boolean).join(' ');
                    if (addr) {
                      try {
                        const res = await fetch(`/api/places/geocode?address=${encodeURIComponent(addr)}`);
                        const data = await res.json().catch(() => ({}));
                        if (data?.ok && typeof data?.lat === 'number' && typeof data?.lng === 'number') {
                          geocodedLat = data.lat;
                          geocodedLng = data.lng;
                        }
                      } catch {
                        // ignore
                      }
                    }
                  }

                  onApply({
                    ...d,
                    project_name: editedProjectName.trim() || d.project_name,
                    project_description: (editedDescription.trim() || d.project_description) ?? d.summary,
                    summary: editedDescription.trim() || d.summary,
                    suggested_trades_with_scope: appliedTrades,
                    suggested_trades: appliedTrades.map((t) => t.trade),
                    geocoded_lat: geocodedLat,
                    geocoded_lng: geocodedLng,
                  });
                  setConfirmApplyOpen(false);
                  onOpenChange(false);
                }
              }}
            >
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
