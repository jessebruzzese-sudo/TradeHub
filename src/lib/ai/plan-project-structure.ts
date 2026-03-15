/**
 * Derive project structure from dwelling groups and building evidence.
 * For multi-dwelling binders, computes storey count PER dwelling group,
 * then derives project-level storey label from grouped results.
 */

import type { DwellingGroup } from './plan-dwelling-grouping';
import type { BuildingElements } from './plan-room-detection';
import { detectBuildingElements } from './plan-room-detection';

const GENERIC_LABELS = new Set(['Unassigned', 'Main']);

export type DwellingStoreySummary = {
  dwellingLabel: string;
  hasGroundFloorPlan: boolean;
  hasFirstFloorPlan: boolean;
  hasSecondFloorPlan: boolean;
  floors: 1 | 2 | 3;
};

export type ProjectStructure = {
  dwellingCount: number;
  dwellingLabels: string[];
  dwellingStoreys: DwellingStoreySummary[];
  likelyStoreysPerDwelling: 1 | 2 | 3;
  likelyStoreyLabel: 'single storey' | 'double storey' | 'triple storey' | 'mixed/uncertain';
  /** For multi-dwelling: true only when ALL dwellings have strong positive evidence for floors=1. */
  hasStrongSingleStoreyEvidence: boolean;
  projectTypeLabel: string;
  isMultiDwelling: boolean;
  /** @deprecated Use likelyStoreyLabel for multi-dwelling. */
  storeyLabel: string;
};

/** Minimum OCR chars per dwelling to trust floors=1 as "single storey". Below this, treat as uncertain. */
const MIN_OCR_FOR_SINGLE_STOREY = 80;

/**
 * Detect storey count per dwelling group from that group's OCR text only.
 */
export function detectStoreysPerDwellingGroup(
  dwellingGroups: DwellingGroup[]
): DwellingStoreySummary[] {
  const results: DwellingStoreySummary[] = [];

  for (const group of dwellingGroups) {
    const groupText = group.pages
      .map((p) => p.ocrText ?? '')
      .filter(Boolean)
      .join('\n\n');

    const building = detectBuildingElements(groupText);

    results.push({
      dwellingLabel: group.dwellingLabel,
      hasGroundFloorPlan: building.hasGroundFloorPlan ?? building.hasGroundFloor,
      hasFirstFloorPlan: building.hasFirstFloorPlan ?? building.hasFirstFloor,
      hasSecondFloorPlan: building.hasSecondFloor,
      floors: Math.min(3, Math.max(1, building.floors)) as 1 | 2 | 3,
    });
  }

  return results;
}

/**
 * Check if we have STRONG positive evidence for single storey.
 * Requires: sufficient OCR per dwelling AND each dwelling has ground-floor evidence but NO first-floor plan.
 * Do NOT trust floors=1 from lack of evidence (default) – only when explicitly single-storey.
 */
function hasStrongSingleStoreyEvidenceInternal(
  dwellingStoreys: DwellingStoreySummary[],
  dwellingGroups: DwellingGroup[]
): boolean {
  for (const ds of dwellingStoreys) {
    const group = dwellingGroups.find((g) => g.dwellingLabel === ds.dwellingLabel);
    if (!group) continue;
    const textLen = group.pages.map((p) => p.ocrText ?? '').join('').length;
    if (textLen < MIN_OCR_FOR_SINGLE_STOREY) return false;
    // Require positive evidence: has ground floor plan/layout but NOT first floor plan
    if (!ds.hasGroundFloorPlan) return false;
    if (ds.hasFirstFloorPlan) return false; // First floor plan present = not single storey
  }
  return true;
}

/**
 * Derive project-level storey label from per-dwelling storey summaries.
 * For multi-dwelling: only return "single storey" when ALL dwellings explicitly resolve to floors=1
 * with sufficient OCR evidence. Do NOT return "single storey" from lack of evidence.
 */
function deriveLikelyStoreyLabel(
  dwellingStoreys: DwellingStoreySummary[],
  namedDwellingStoreys: DwellingStoreySummary[],
  isMultiDwelling: boolean,
  dwellingGroups: DwellingGroup[]
): ProjectStructure['likelyStoreyLabel'] {
  if (!isMultiDwelling) {
    const single = namedDwellingStoreys[0] ?? dwellingStoreys[0];
    if (!single) return 'single storey';
    if (single.floors >= 3) return 'triple storey';
    if (single.floors === 2) return 'double storey';
    return 'single storey';
  }

  if (namedDwellingStoreys.length === 0) return 'mixed/uncertain';

  const withTwoOrMore = namedDwellingStoreys.filter((d) => d.floors >= 2);
  const withThree = namedDwellingStoreys.filter((d) => d.floors >= 3);
  const allSingle = namedDwellingStoreys.every((d) => d.floors === 1);

  if (withThree.length >= 1) return 'triple storey';
  if (withTwoOrMore.length >= namedDwellingStoreys.length * 0.6) return 'double storey';
  // Only return "single storey" when we have STRONG positive evidence – never from lack of evidence
  if (allSingle && hasStrongSingleStoreyEvidenceInternal(namedDwellingStoreys, dwellingGroups)) return 'single storey';
  return 'mixed/uncertain';
}

/**
 * Derive project structure from dwelling groups and optional global building fallback.
 * For multi-dwelling, uses per-dwelling storey detection; for single dwelling, uses global building.
 */
export function deriveProjectStructure(
  dwellingGroups: DwellingGroup[],
  building: BuildingElements
): ProjectStructure {
  const namedDwellings = dwellingGroups.filter(
    (g) => !GENERIC_LABELS.has(g.dwellingLabel)
  );
  const dwellingCount = Math.max(1, namedDwellings.length);
  const dwellingLabels = namedDwellings.map((g) => g.dwellingLabel);
  const isMultiDwelling = dwellingCount >= 2;

  const dwellingStoreys = detectStoreysPerDwellingGroup(dwellingGroups);
  const namedDwellingStoreys = dwellingStoreys.filter((s) =>
    dwellingLabels.includes(s.dwellingLabel)
  );

  const likelyStoreyLabel = deriveLikelyStoreyLabel(
    dwellingStoreys,
    namedDwellingStoreys,
    isMultiDwelling,
    dwellingGroups
  );

  const hasStrongSingleStoreyEvidence =
    isMultiDwelling && likelyStoreyLabel === 'single storey'
      ? hasStrongSingleStoreyEvidenceInternal(namedDwellingStoreys, dwellingGroups)
      : false;

  let likelyStoreysPerDwelling: 1 | 2 | 3 = 1;
  if (likelyStoreyLabel === 'triple storey') likelyStoreysPerDwelling = 3;
  else if (likelyStoreyLabel === 'double storey') likelyStoreysPerDwelling = 2;

  const storeyLabel =
    likelyStoreyLabel === 'mixed/uncertain'
      ? 'residential'
      : likelyStoreyLabel;

  const projectTypeLabel = isMultiDwelling
    ? `multi-dwelling residential (${dwellingCount} dwellings)`
    : 'residential dwelling';

  return {
    dwellingCount,
    dwellingLabels,
    dwellingStoreys,
    likelyStoreysPerDwelling,
    likelyStoreyLabel,
    hasStrongSingleStoreyEvidence,
    projectTypeLabel,
    isMultiDwelling,
    storeyLabel,
  };
}
