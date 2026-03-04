import { z } from 'zod';

/**
 * AI-generated tender draft from plans/PDFs.
 * Used by GenerateFromPlansModal and plan-draft APIs.
 */
export type TenderAIDraft = {
  project_name?: string | null;
  summary?: string | null;
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

export const TenderAIDraftSchema = z.object({
  project_name: z.string().default(''),
  summary: z.string().default(''),

  confirmed_from_plans: z.array(z.string()).default([]),
  questions_to_confirm: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),

  suggested_trades: z.array(z.string()).default([]),
  trade_scopes: z.record(z.string(), z.array(z.string())).default({}),

  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  timing_notes: z.array(z.string()).default([]),
  site_access_notes: z.array(z.string()).default([]),

  // ✅ NEW:
  quantities_and_schedules: z.array(z.string()).default([]),
  quote_checklist: z.record(z.string(), z.array(z.string())).default({}),
});
