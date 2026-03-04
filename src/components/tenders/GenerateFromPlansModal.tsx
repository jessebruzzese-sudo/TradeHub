'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Draft = {
  project_name?: string;
  summary?: string;
  suggested_trades?: string[];
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
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** For edit flow: tender has shared_attachments */
  tenderId?: string;
  /** For create flow: files before tender exists */
  files?: File[];
  onApply: (draft: Draft) => void;
};

export function GenerateFromPlansModal({
  open,
  onOpenChange,
  tenderId,
  files,
  onApply,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [stage, setStage] = useState(0);

  const hasInput = (files?.length ?? 0) > 0 || !!tenderId;

  async function generate() {
    if (!hasInput) return;

    try {
      setLoading(true);
      setDraft(null);
      setStage(1);

      const t1 = setTimeout(() => setStage(2), 800);
      const t2 = setTimeout(() => setStage(3), 1600);

      let res: Response;

      if (tenderId) {
        res = await fetch(`/api/tenders/${tenderId}/plan-draft`, { method: 'POST' });
      } else if (files?.length) {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        res = await fetch('/api/ai/plan-draft-from-files', { method: 'POST', body: formData });
      } else {
        return;
      }

      const json = await res.json();

      clearTimeout(t1);
      clearTimeout(t2);

      if (!res.ok) throw new Error(json?.error || 'Failed');

      setDraft(json.draft);
      setStage(3);

      toast.success('Draft generated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && tenderId) generate();
  }, [open, tenderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">

        <DialogHeader>
          <DialogTitle>Generate tender from plans</DialogTitle>
        </DialogHeader>

        {!draft && !loading && !hasInput && (
          <p className="text-sm text-slate-600">Upload plans or attach files to this tender first.</p>
        )}

        {!draft && !loading && hasInput && !tenderId && (
          <div className="space-y-3 text-sm text-slate-600">
            Ready to generate from {files?.length ?? 0} file(s).
            <Button onClick={generate} disabled={loading}>
              Generate
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">

            <div className="text-sm font-medium">
              Generating from plans…
            </div>

            <div className="text-sm text-slate-600">
              {stage >= 1 && 'Reading plans…'}
              {stage >= 2 && ' Identifying trades…'}
              {stage >= 3 && ' Drafting tender…'}
            </div>

            <div className="h-2 w-full bg-slate-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${stage * 33}%` }}
              />
            </div>
          </div>
        )}

        {!loading && draft && (
          <div className="space-y-4 text-sm">

            {draft.summary && (
              <div>
                <div className="font-semibold mb-1">Summary</div>
                <div className="text-slate-700">{draft.summary}</div>
              </div>
            )}

            {draft.suggested_trades?.length ? (
              <div>
                <div className="font-semibold mb-1">
                  Suggested trades
                </div>

                <div className="space-y-3">

                  {draft.suggested_trades.map((trade) => (
                    <div
                      key={trade}
                      className="rounded-lg border p-3 bg-slate-50"
                    >
                      <div className="font-medium mb-1">
                        {trade}
                      </div>

                      {draft.trade_scopes?.[trade]?.length ? (
                        <ul className="list-disc pl-4 text-slate-700">
                          {draft.trade_scopes[trade].map(
                            (s: string, i: number) => (
                              <li key={i}>{s}</li>
                            )
                          )}
                        </ul>
                      ) : (
                        <div className="text-xs text-slate-500">
                          No scope detected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {draft.quantities_and_schedules?.length ? (
              <div className="rounded-xl border bg-white/70 p-4">
                <div className="font-semibold text-slate-900">Quantities & schedules</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
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
                  {Object.entries(draft.quote_checklist).map(([trade, items]) => (
                    <div key={trade} className="rounded-lg border bg-slate-50 p-3">
                      <div className="font-medium text-slate-900">{trade}</div>
                      {items?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {items.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-1 text-xs text-slate-500">No checklist items.</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                onClick={() => {
                  if (draft) {
                    onApply(draft);
                    onOpenChange(false);
                  }
                }}
              >
                Apply draft
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
