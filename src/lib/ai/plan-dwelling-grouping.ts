/**
 * Group plan pages by dwelling/building for multi-dwelling binders.
 * Detects labels like Dwelling 1, Unit 1, Residence A in headings/title blocks.
 */

import type { PlanPageAnalysis } from './pdf-plan-preprocess';

export type DwellingGroup = {
  dwellingLabel: string;
  pages: PlanPageAnalysis[];
};

/** Patterns to detect dwelling labels in text (case-insensitive). */
const DWELLING_PATTERNS: RegExp[] = [
  /\bdwelling\s+(\d+[a-z]?)\b/gi,
  /\bunit\s+(\d+[a-z]?)\b/gi,
  /\bresidence\s+([a-z])\b/gi,
  /\bresidence\s+(\d+)\b/gi,
  /\bbuilding\s+(\d+[a-z]?)\b/gi,
  /\blot\s+(\d+)\b/gi,
  /\btype\s+([a-z])\b/gi,
  /\btype\s+(\d+)\b/gi,
  /\bhouse\s+(\d+)\b/gi,
  /\bhome\s+(\d+)\b/gi,
];

/**
 * Extract dwelling label from page text if present.
 */
export function extractDwellingLabel(text: string): string | null {
  if (!text || typeof text !== 'string') return null;

  for (const re of DWELLING_PATTERNS) {
    const match = text.match(re);
    if (match) {
      const label = match[0].trim();
      if (label.length >= 4 && label.length <= 30) return label;
    }
  }

  return null;
}

/**
 * Group pages by dwelling label.
 * Pages with the same label go into the same group.
 * Pages with no label go into a default "Main" or "Single" group.
 */
export function groupPagesByDwelling(pages: PlanPageAnalysis[]): DwellingGroup[] {
  if (!pages?.length) return [];

  const byLabel = new Map<string, PlanPageAnalysis[]>();
  const unlabeled: PlanPageAnalysis[] = [];

  for (const page of pages) {
    const label =
      page.dwellingLabel ??
      extractDwellingLabel(page.ocrText) ??
      extractDwellingLabel(page.headingHints?.join(' ') ?? '');

    if (label) {
      const existing = byLabel.get(label) ?? [];
      existing.push(page);
      byLabel.set(label, existing);
    } else {
      unlabeled.push(page);
    }
  }

  const groups: DwellingGroup[] = [];

  for (const [label, groupPages] of byLabel) {
    groups.push({ dwellingLabel: label, pages: groupPages });
  }

  if (unlabeled.length > 0) {
    const defaultLabel = groups.length > 0 ? 'Unassigned' : 'Main';
    groups.push({ dwellingLabel: defaultLabel, pages: unlabeled });
  }

  return groups;
}
