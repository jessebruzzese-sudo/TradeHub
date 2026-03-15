/**
 * Page type classification for construction plan binders.
 * Classifies pages based on OCR/extracted text and headings.
 * Used to prioritize relevant sheets for AI context.
 */

export type PlanPageType =
  | 'architectural'
  | 'electrical'
  | 'roof'
  | 'site'
  | 'fencing'
  | 'details'
  | 'unknown';

export type PageClassificationResult = {
  pageType: PlanPageType;
  confidence: number;
  matchedKeywords: string[];
};

/** Keywords per page type (lowercase). Order matters for tie-breaking. */
const PAGE_TYPE_KEYWORDS: Record<PlanPageType, string[]> = {
  architectural: [
    'floor plan',
    'ground floor plan',
    'first floor plan',
    'proposed ground floor',
    'proposed first floor',
    'elevations',
    'elevation',
    'sections',
    'section',
    'new dwelling',
    'dwelling plan',
    'floor layout',
    'floor plan',
    'proposed floor',
    'internal layout',
    'external elevation',
    'north elevation',
    'south elevation',
    'east elevation',
    'west elevation',
    'building plan',
  ],
  electrical: [
    'electrical layout',
    'electrical plan',
    'lighting layout',
    'lighting plan',
    'gpo',
    'switch',
    'smoke alarm',
    'data point',
    'power point',
    'switchboard',
    'meter',
    'electrical',
    'lighting',
    'nbn',
    'exhaust fan',
    'downlight',
  ],
  roof: [
    'roof plan',
    'roof layout',
    'gutter',
    'downpipe',
    'stormwater',
    'rainwater',
    'rain water',
    'roof drainage',
    'ridge',
    'valley',
    'sarking',
    'roof framing',
    'roof truss',
  ],
  site: [
    'site plan',
    'site layout',
    'setbacks',
    'north point',
    'title boundary',
    'boundary',
    'lot',
    'easement',
    'contour',
    'survey',
    'site context',
  ],
  fencing: [
    'fence plan',
    'fence elevation',
    'side boundary fence',
    'boundary fence',
    'pool fence',
    'fencing',
    'fence detail',
  ],
  details: [
    'construction detail',
    'waterproofing detail',
    'stair detail',
    'wall section',
    'typical detail',
    'detail',
    'section detail',
    'jamb detail',
    'sill detail',
  ],
  unknown: [],
};

/**
 * Classify a page based on its text content.
 * Returns pageType and confidence (0–1).
 */
export function classifyPlanPage(text: string): PageClassificationResult {
  if (!text || typeof text !== 'string') {
    return { pageType: 'unknown', confidence: 0, matchedKeywords: [] };
  }

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const bigrams = words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`);
  const trigrams = words.slice(0, -2).map((w, i) => `${w} ${words[i + 1]} ${words[i + 2]}`);
  const searchable = new Set([...words, ...bigrams, ...trigrams]);

  let bestType: PlanPageType = 'unknown';
  let bestScore = 0;
  const bestMatches: string[] = [];

  for (const [pageType, keywords] of Object.entries(PAGE_TYPE_KEYWORDS)) {
    if (pageType === 'unknown') continue;

    const matches: string[] = [];
    let score = 0;

    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (searchable.has(kwLower)) {
        matches.push(kw);
        score += 3;
      } else if (lower.includes(kwLower)) {
        matches.push(kw);
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = pageType as PlanPageType;
      bestMatches.length = 0;
      bestMatches.push(...matches);
    }
  }

  // Normalize confidence: 0.3 base + up to 0.6 from score (cap at ~15 points)
  const confidence = Math.min(0.95, 0.3 + (Math.min(bestScore, 15) / 15) * 0.6);

  return {
    pageType: bestType,
    confidence: bestScore > 0 ? confidence : 0,
    matchedKeywords: bestMatches.slice(0, 8),
  };
}
