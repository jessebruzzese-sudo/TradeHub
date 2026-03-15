/**
 * Build structured AI context from classified pages, dwelling groups, and signals.
 * Prioritizes useful pages and assembles context for the plan draft AI.
 */

import type { PlanPageAnalysis } from './pdf-plan-preprocess';
import type { DwellingGroup } from './plan-dwelling-grouping';
import type { RoomCounts, BuildingElements } from './plan-room-detection';
import type { DrainageDetection } from './plan-drainage-detection';
import type { InferredTrade } from './plan-trade-inference';
import { deriveProjectStructure, type ProjectStructure } from './plan-project-structure';

const GENERIC_LABELS = new Set(['Unassigned', 'Main']);

const PAGE_TYPE_PRIORITY: Record<string, number> = {
  architectural: 100,
  site: 95,
  roof: 90,
  electrical: 85,
  details: 40,
  fencing: 30,
  unknown: 10,
};

export type PlanAIContext = {
  projectHints: string[];
  dwellingGroups: {
    label: string;
    pageTypes: string[];
    extractedContext: string;
  }[];
  /** Number of named dwellings (excludes Unassigned/Main). 1 = single dwelling. */
  detectedDwellingCount: number;
  /** Labels of named dwelling groups (e.g. ["Dwelling 1", "Dwelling 2"]). */
  detectedDwellingLabels: string[];
  /** Derived project structure for prompt and fallbacks. */
  projectStructure: ProjectStructure;
  /** Structured dwelling summary for prompt, e.g. "Dwelling 1: architectural, electrical, roof" */
  dwellingSummaryLines: string[];
  ignoredPageTypes: string[];
  combinedText: string;
  pageSummary: string;
};

/**
 * Prioritize pages for AI context. Higher priority pages come first.
 */
function prioritizePages(pages: PlanPageAnalysis[]): PlanPageAnalysis[] {
  return [...pages].sort((a, b) => {
    const scoreA = PAGE_TYPE_PRIORITY[a.pageType] ?? 10;
    const scoreB = PAGE_TYPE_PRIORITY[b.pageType] ?? 10;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.pageNumber - b.pageNumber;
  });
}

/**
 * Build structured AI context from preprocessed pages and dwelling groups.
 */
export function buildPlanAIContext(
  pages: PlanPageAnalysis[],
  dwellingGroups: DwellingGroup[],
  roomCounts: RoomCounts,
  building: BuildingElements,
  drainage: DrainageDetection,
  inferredTrades: InferredTrade[],
  embeddedText: string,
  imageOcrText: string
): PlanAIContext {
  const prioritized = prioritizePages(pages);
  const highValueTypes = new Set(['architectural', 'site', 'roof', 'electrical']);
  const lowValueTypes = new Set(['fencing', 'details']);
  const selectedPages = prioritized.filter(
    (p) => highValueTypes.has(p.pageType) || (p.pageType !== 'unknown' && !lowValueTypes.has(p.pageType))
  );
  if (selectedPages.length === 0) selectedPages.push(...prioritized.slice(0, 8));

  const ignoredPageTypes = Array.from(
    new Set(pages.filter((p) => lowValueTypes.has(p.pageType)).map((p) => p.pageType))
  );

  const projectHints: string[] = [];
  if (building.floors >= 2) {
    projectHints.push(`${building.floors === 2 ? 'Double' : 'Triple'} storey dwelling`);
  }
  if (building.hasGarage) projectHints.push('Garage');
  if (building.hasAlfresco) projectHints.push('Alfresco');
  if (building.hasRoofPlan) projectHints.push('Roof plan present');
  if (roomCounts.bathrooms > 0 || roomCounts.ensuites > 0) {
    projectHints.push(
      `Wet areas: ${roomCounts.bathrooms} bathroom(s), ${roomCounts.ensuites} ensuite(s), ${roomCounts.kitchens} kitchen(s), ${roomCounts.laundries} laundry`
    );
  }
  if (drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters) {
    projectHints.push('Stormwater/drainage scope');
  }
  const projectStructure = deriveProjectStructure(dwellingGroups, building);
  const { dwellingCount: detectedDwellingCount, dwellingLabels: detectedDwellingLabels } = projectStructure;
  if (detectedDwellingCount >= 2) {
    projectHints.push(`Multi-dwelling (${detectedDwellingCount} dwellings): ${detectedDwellingLabels.join(', ')}`);
  }
  if (detectedDwellingCount >= 2 && projectStructure.likelyStoreyLabel !== 'mixed/uncertain') {
    projectHints.push(`Grouped floor-plan evidence indicates ${projectStructure.likelyStoreyLabel} dwellings.`);
  }
  if (detectedDwellingCount >= 2 && projectStructure.dwellingStoreys.length > 0) {
    const storeyLines = projectStructure.dwellingStoreys
      .filter((s) => !GENERIC_LABELS.has(s.dwellingLabel))
      .map((s) => `${s.dwellingLabel}: ${s.floors} storey${s.floors > 1 ? 's' : ''} (ground+first: ${s.hasGroundFloorPlan && s.hasFirstFloorPlan})`)
      .slice(0, 5);
    if (storeyLines.length > 0) {
      projectHints.push(`Per-dwelling storeys: ${storeyLines.join('; ')}`);
    }
  }

  const dwellingContexts = dwellingGroups.map((g) => {
    const pageTypes = [...new Set(g.pages.map((p) => p.pageType))];
    const extractedContext = g.pages
      .map((p) => `[Page ${p.pageNumber} - ${p.pageType}]\n${p.ocrText}`)
      .join('\n\n');
    return {
      label: g.dwellingLabel,
      pageTypes,
      extractedContext: extractedContext.slice(0, 15000),
    };
  });

  // Group pages by type for structured AI context (replaces flat text blob)
  const architectural = selectedPages.filter((p) => p.pageType === 'architectural');
  const site = selectedPages.filter((p) => p.pageType === 'site');
  const electrical = selectedPages.filter((p) => p.pageType === 'electrical');
  const roof = selectedPages.filter((p) => p.pageType === 'roof');
  const details = selectedPages.filter((p) => p.pageType === 'details');
  const fencing = selectedPages.filter((p) => p.pageType === 'fencing');
  const other = selectedPages.filter((p) => p.pageType === 'unknown');

  const section = (title: string, pages: PlanPageAnalysis[]) => {
    const text = pages
      .filter((p) => p.ocrText?.trim())
      .map((p) => `[Page ${p.pageNumber}]\n${p.ocrText!.trim()}`)
      .join('\n\n');
    return text ? `\n\n${title}\n${text}` : '';
  };

  const structuredParts: string[] = [];
  if (embeddedText?.trim()) {
    structuredParts.push(`--- Embedded PDF text ---\n${embeddedText.trim()}`);
  }
  structuredParts.push(section('ARCHITECTURAL PLANS', architectural));
  structuredParts.push(section('SITE PLAN', site));
  structuredParts.push(section('ELECTRICAL LAYOUT', electrical));
  structuredParts.push(section('ROOF PLAN', roof));
  structuredParts.push(section('CONSTRUCTION DETAILS', details));
  structuredParts.push(section('FENCING', fencing));
  structuredParts.push(section('OTHER PAGES', other));
  if (imageOcrText?.trim()) {
    structuredParts.push(`\n\n--- Image OCR ---\n${imageOcrText.trim()}`);
  }

  const combinedText = structuredParts.filter(Boolean).join('');
  if (typeof console !== 'undefined' && console.log) {
    console.log('[generate-from-plans] structured AI context', {
      architectural: architectural.length,
      site: site.length,
      electrical: electrical.length,
      roof: roof.length,
      details: details.length,
      fencing: fencing.length,
      other: other.length,
    });
    console.log('[generate-from-plans] aiContext length', combinedText.length);
  }
  const pageSummary = selectedPages
    .map((p) => `P${p.pageNumber}: ${p.pageType}`)
    .join(', ');

  const dwellingSummaryLines = dwellingContexts.map(
    (g) => `${g.label}: ${g.pageTypes.join(', ')}`
  );

  return {
    projectHints,
    dwellingGroups: dwellingContexts,
    detectedDwellingCount,
    detectedDwellingLabels,
    projectStructure,
    dwellingSummaryLines,
    ignoredPageTypes,
    combinedText,
    pageSummary,
  };
}
