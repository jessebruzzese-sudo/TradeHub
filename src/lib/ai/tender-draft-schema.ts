import { z } from 'zod';

/**
 * AI-generated tender draft from plans/PDFs.
 * Used by GenerateFromPlansModal and plan-draft APIs.
 */

/** Detected site/location from plan text (address, suburb, postcode, state). */
export type DetectedLocation = {
  address_text?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  state?: string | null;
  confidence?: number;
};

/** Single trade suggestion with scope for tender autofill */
export type SuggestedTradeWithScope = {
  trade: string;
  scope: string;
  confidence?: number;
  evidence?: string[];
};

export type TenderAIDraft = {
  project_name?: string | null;
  summary?: string | null;
  project_description?: string | null; // alias for summary, used by Apply draft
  suggested_trades?: string[];
  /** New: trades with scope for direct form mapping */
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
  /** Detected site/location from plans – populate Tender Location section. */
  detected_location?: DetectedLocation | null;
  /** Detected wet areas/rooms from plan text. */
  detected_rooms?: {
    bathrooms: number;
    ensuites: number;
    laundries: number;
    kitchens: number;
    wc: number;
    powder_rooms: number;
  } | null;
  /** Short "Detected from plans" summary items for modal display. */
  plan_summary?: { summaryItems: string[] } | null;
  /** Overall plan analysis confidence: HIGH, MEDIUM, or LOW. */
  plan_confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  /** Concise list of signals detected from plans (e.g. Bathroom, WC, Stormwater, Garage). */
  detected_signals?: string[] | null;
  /** Detected building elements (floors, garage, alfresco, roof plan). */
  detected_building?: {
    floors: number;
    hasGroundFloor?: boolean;
    hasFirstFloor?: boolean;
    hasSecondFloor?: boolean;
    hasGarage: boolean;
    hasAlfresco: boolean;
    hasRoofPlan: boolean;
  } | null;
  /** Number of dwellings detected from plan grouping (1 = single, 2+ = multi-dwelling). */
  detected_dwelling_count?: number | null;
  /** Labels of detected dwelling groups (e.g. ["Dwelling 1", "Dwelling 2"]). */
  detected_dwelling_labels?: string[] | null;
  /** Project-level storey label from grouped dwelling analysis. Use for multi-dwelling UI. */
  likely_storey_label?: 'single storey' | 'double storey' | 'triple storey' | 'mixed/uncertain' | null;
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

  detected_location: z
    .object({
      address_text: z.string().nullable().optional(),
      suburb: z.string().nullable().optional(),
      postcode: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      confidence: z.number().optional(),
    })
    .nullable()
    .optional(),
});
