/**
 * Plan confidence scoring and detected signals aggregation.
 */

import type { RoomCounts } from '@/lib/ai/plan-room-detection';
import type { BuildingElements } from '@/lib/ai/plan-room-detection';
import type { DrainageDetection } from '@/lib/ai/plan-drainage-detection';
import type { InferredTrade } from '@/lib/ai/plan-trade-inference';

export type PlanConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type PlanConfidenceInput = {
  extractedTextLength: number;
  locationDetected: boolean;
  roomCounts: RoomCounts;
  building: BuildingElements;
  drainage: DrainageDetection;
  inferredTradesCount: number;
};

/**
 * Compute overall plan confidence from detection signals.
 * HIGH: most signals present; MEDIUM: some signals; LOW: few signals.
 */
export function computePlanConfidence(input: PlanConfidenceInput): PlanConfidence {
  const { extractedTextLength, locationDetected, roomCounts, building, drainage, inferredTradesCount } = input;

  const hasRoomCounts =
    roomCounts.bathrooms > 0 || roomCounts.kitchens > 0 || roomCounts.laundries > 0 || roomCounts.ensuites > 0;
  const hasFloors = building.floors >= 1;
  const hasDrainage =
    drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters || drainage.hasRainwater;

  if (
    extractedTextLength > 800 &&
    locationDetected &&
    hasRoomCounts &&
    hasFloors &&
    inferredTradesCount >= 3
  ) {
    return 'HIGH';
  }

  if (
    extractedTextLength > 300 &&
    (inferredTradesCount >= 2 || locationDetected || hasRoomCounts || hasDrainage)
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
}

export type DetectedSignalsInput = {
  roomCounts: RoomCounts;
  building: BuildingElements;
  drainage: DrainageDetection;
  inferredTrades: InferredTrade[];
  planText: string;
  dwellingCount?: number;
};

const MAX_SIGNALS = 10;

/**
 * Build a concise list of detected signals from plan analysis.
 */
export function buildDetectedSignals(input: DetectedSignalsInput): string[] {
  const signals: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const key = s.toLowerCase().trim();
    if (!seen.has(key) && signals.length < MAX_SIGNALS) {
      seen.add(key);
      signals.push(s);
    }
  };

  const { roomCounts, building, drainage, inferredTrades, planText, dwellingCount } = input;
  const lower = planText.toLowerCase();

  if (dwellingCount && dwellingCount >= 2) add(`${dwellingCount} dwellings`);
  if (roomCounts.bathrooms > 0) add('Bathroom');
  if (roomCounts.ensuites > 0) add('Ensuite');
  if (roomCounts.wc > 0) add('WC');
  if (roomCounts.kitchens > 0) add('Kitchen');
  if (roomCounts.laundries > 0) add('Laundry');
  if (roomCounts.powder_rooms > 0) add('Powder room');

  // Only add floor-level signals when multi-storey; single-storey plans often label the only floor as "First Floor Plan"
  if (building.floors >= 2) add('First floor plan');
  if (building.floors >= 3) add('Second floor plan');
  if (building.hasRoofPlan) add('Roof plan');
  if (building.hasGarage) add('Garage');
  if (building.hasAlfresco) add('Alfresco');

  if (drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters) {
    add('Stormwater');
  }
  if (drainage.hasDownpipes) add('Downpipe');
  if (drainage.hasGutters) add('Gutter');

  if (lower.includes('floor waste')) add('Floor waste');
  if (lower.includes('lighting')) add('Lighting plan');

  for (const t of inferredTrades.slice(0, 4)) {
    const label = t.trade;
    if (label === 'Roof plumbing / stormwater') add('Roof drainage');
    else if (label === 'Electrical' && !seen.has('lighting plan')) add('Lighting plan');
    else if (label === 'Roofing' && !seen.has('roof plan')) add('Roof plan');
  }

  return signals;
}
