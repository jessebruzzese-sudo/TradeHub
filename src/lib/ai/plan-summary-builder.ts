/**
 * Builds a short "Detected from plans" summary from room detection, inferred trades, and plan text.
 */

import type { RoomCounts, BuildingElements } from '@/lib/ai/plan-room-detection';
import type { DrainageDetection } from '@/lib/ai/plan-drainage-detection';
import type { InferredTrade } from '@/lib/ai/plan-trade-inference';

const MAX_SUMMARY_ITEMS = 6;

export type PlanSummaryInput = {
  roomDetection: RoomCounts;
  inferredTrades: InferredTrade[];
  planText: string;
  projectType?: string;
  building?: BuildingElements | null;
  drainage?: DrainageDetection | null;
  dwellingCount?: number;
  /** When true, prefer "Double-storey floor plans" over "Single storey dwelling" for multi-dwelling. */
  storeySupportsDouble?: boolean;
  /** Project-level storey label from grouped dwelling analysis. For multi-dwelling, use this instead of building.floors. */
  likelyStoreyLabel?: 'single storey' | 'double storey' | 'triple storey' | 'mixed/uncertain';
};

export type PlanSummaryResult = {
  summaryItems: string[];
};

/**
 * Build summary items for "Detected from plans" section.
 * Limit to 4–6 items.
 */
export function buildPlanSummary(input: PlanSummaryInput): PlanSummaryResult {
  const { roomDetection, inferredTrades, planText, building, drainage } = input;
  const items: string[] = [];
  const lower = (planText ?? '').toLowerCase();

  // Multi-dwelling
  if (input.dwellingCount && input.dwellingCount >= 2) {
    items.push(input.dwellingCount === 2 ? '2 dwellings' : `${input.dwellingCount} dwellings`);
  }

  // Project type or storey – for multi-dwelling, use likelyStoreyLabel from grouped evidence
  const multiDwelling = (input.dwellingCount ?? 0) >= 2;
  const storeyLabel = input.likelyStoreyLabel;
  // For multi-dwelling: treat undefined as mixed/uncertain – never add single storey without explicit proof
  const storeyConfidentlyKnown = storeyLabel === 'double storey' || storeyLabel === 'triple storey' || storeyLabel === 'single storey';
  if (input.projectType) {
    items.push(input.projectType);
  } else if (multiDwelling && (storeyLabel === 'double storey' || storeyLabel === 'triple storey')) {
    items.push(storeyLabel === 'triple storey' ? 'Triple-storey floor plans' : 'Double-storey floor plans');
  } else if (multiDwelling && (storeyLabel === 'mixed/uncertain' || !storeyConfidentlyKnown)) {
    // Do NOT show "Single storey" when uncertain or undefined – omit storey wording
  } else if (multiDwelling && storeyLabel === 'single storey') {
    items.push('Single storey dwellings');
  } else if (building && building.floors >= 2 && !multiDwelling) {
    items.push(building.floors >= 3 ? 'Triple storey dwelling' : 'Double storey dwelling');
  } else if (building && building.floors === 1 && !multiDwelling) {
    items.push('Single storey dwelling');
  } else if (lower.includes('renovation')) {
    items.push('Renovation');
  } else if (lower.includes('extension')) {
    items.push('Extension');
  } else if (lower.includes('dwelling') || lower.includes('new build') || lower.includes('residential')) {
    items.push('New residential dwelling');
  }

  // Wet areas from room detection: "2 bathrooms + 1 ensuite"
  const r = roomDetection;
  const wetParts: string[] = [];
  if (r.bathrooms > 0) wetParts.push(`${r.bathrooms} bathroom${r.bathrooms > 1 ? 's' : ''}`);
  if (r.ensuites > 0) wetParts.push(`${r.ensuites} ensuite${r.ensuites > 1 ? 's' : ''}`);
  if (wetParts.length > 0) {
    items.push(wetParts.join(' + '));
  }

  // Kitchen and laundry
  if (r.kitchens > 0 || r.laundries > 0) {
    const kAndL: string[] = [];
    if (r.kitchens > 0) kAndL.push('kitchen');
    if (r.laundries > 0) kAndL.push('laundry');
    if (kAndL.length > 0) items.push(kAndL.join(' and '));
  }

  // Trade-based hints from inferred trades (Electrical → lighting, Roofing → roof drainage, etc.)
  const tradeToSummary: Record<string, string> = {
    Electrical: 'lighting layout',
    Roofing: 'roof drainage',
    Waterproofing: 'wet area waterproofing',
    Carpentry: 'structural framing',
  };
  for (const t of inferredTrades) {
    const label = tradeToSummary[t.trade];
    if (label && (t.confidence ?? 0) >= 0.5) {
      const key = label.toLowerCase();
      const already = items.some((i) => i.toLowerCase().includes(key.split(' ')[0]));
      if (!already) items.push(label);
    }
  }

  // Garage and alfresco
  if (building?.hasGarage && building?.hasAlfresco) {
    items.push('Garage and alfresco');
  } else if (building?.hasGarage) {
    items.push('Garage');
  } else if (building?.hasAlfresco) {
    items.push('Alfresco');
  }

  // Stormwater / roof drainage
  if (drainage && (drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters) && !items.some((i) => i.toLowerCase().includes('roof') || i.toLowerCase().includes('drainage'))) {
    items.push('Roof drainage');
  }

  // Plan text feature keywords (fallback when trade inference didn't add them)
  if (lower.includes('lighting') && !items.some((i) => i.toLowerCase().includes('lighting'))) {
    items.push('lighting layout');
  }
  if ((lower.includes('gutter') || lower.includes('downpipe')) && !items.some((i) => i.toLowerCase().includes('roof'))) {
    items.push('roof drainage');
  }

  // Dedupe and limit
  const seen = new Set<string>();
  let deduped = items.filter((i) => {
    const key = i.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // For multi-dwelling: never show "Single storey dwelling(s)" unless storey is confidently single
  if (multiDwelling && !storeyConfidentlyKnown) {
    deduped = deduped.filter(
      (i) => !/single\s*[- ]?storey\s*dwelling(s)?/i.test(i.trim())
    );
  }

  return {
    summaryItems: deduped.slice(0, MAX_SUMMARY_ITEMS),
  };
}
