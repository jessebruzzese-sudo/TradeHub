/**
 * Deterministic location inference from plan text.
 * Used as fallback when AI does not return detected_location, or to provide hints to the AI prompt.
 * Includes plausibility filtering to reject garbage extracted from plan notes/specifications.
 */

import type { DetectedLocation } from '@/lib/ai/tender-draft-schema';

/** Common street type suffixes for address matching */
const STREET_TYPES = [
  'Court', 'Street', 'Drive', 'Road', 'Avenue', 'Lane', 'Place', 'Crescent',
  'Way', 'Terrace', 'Parade', 'Grove', 'Close', 'Circuit', 'Boulevard',
];

/** Known Victorian suburbs (extend as needed for other states) */
const KNOWN_SUBURBS = [
  'South Morang', 'North Melbourne', 'Melbourne', 'Sydney', 'Brisbane',
  'Perth', 'Adelaide', 'Canberra', 'Epping', 'Preston', 'Reservoir',
  'Bundoora', 'Mill Park', 'Thomastown', 'Lalor', 'Greensborough',
  'Heidelberg', 'Doncaster', 'Box Hill', 'Ringwood', 'Glen Waverley',
  'Bulleen', 'Templestowe', 'Doncaster East',
];

/** Australian state abbreviations */
const STATE_ABBREVS = ['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

/** Max reasonable length for address_text (single line) */
const MAX_ADDRESS_LENGTH = 80;

/** Patterns that indicate note/specification garbage, not address */
const GARBAGE_PATTERNS: RegExp[] = [
  /\b(shall|must|should|may|will)\b/i,
  /\bbe\s+provided\b/i,
  /\bas\s+per\s+(the|plans?|specification)/i,
  /\bthe\s+threshold\b/i,
  /\binternal\s+doorway\b/i,
  /\bdoorway\s+to\b/i,
  /\bminimum\s+(width|height|clearance)/i,
  /\bcomply\s+with\b/i,
  /\bin\s+accordance\s+with\b/i,
  /\bunless\s+otherwise\b/i,
  /\bwhere\s+(shown|indicated|specified)/i,
  /\bto\s+the\s+satisfaction\b/i,
  /\b\d+\s+The\s+/i,  // "5 The threshold..."
  /\b\d+\s+[A-Z][a-z]+\s+the\s+/i,  // "5 An internal..."
];

/** Stopwords that suggest sentence/note text rather than address */
const ADDRESS_STOPWORDS = /\b(the|of|an|to|and|be|shall|must|where|when|unless|provided|accordance|satisfaction|indicated|specified|shown|internal|external|minimum|maximum)\b/gi;

/**
 * Check if a string looks like a plausible address, not note/specification garbage.
 */
export function isPlausibleAddressText(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 5 || t.length > MAX_ADDRESS_LENGTH) return false;
  if (GARBAGE_PATTERNS.some((re) => re.test(t))) return false;
  const stopwordMatches = t.match(ADDRESS_STOPWORDS);
  if (stopwordMatches && stopwordMatches.length >= 2) return false;
  const hasStreetType = new RegExp(`\\b(?:${STREET_TYPES.join('|')})\\b`, 'i').test(t);
  const hasNumberThenName = /\d+\s+[A-Za-z]+/.test(t);
  const hasSuburbLike = /[A-Za-z]+\s+[A-Za-z]+/.test(t);
  return hasStreetType || (hasNumberThenName && hasSuburbLike);
}

/**
 * Check if a string looks like a plausible suburb name.
 */
export function isPlausibleSuburb(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (GARBAGE_PATTERNS.some((re) => re.test(t))) return false;
  if (/\d{4,}/.test(t)) return false;
  if (/\b(the|of|an|to|shall|must|shall|provided)\b/i.test(t)) return false;
  return /^[A-Za-z\s\-']+$/.test(t);
}

/**
 * Clean and validate a detected location. Rejects implausible address_text; keeps suburb/postcode if valid.
 */
export function cleanDetectedLocation(loc: DetectedLocation | null | undefined): DetectedLocation | null {
  if (!loc || (typeof loc !== 'object')) return null;
  const result: DetectedLocation = { confidence: loc.confidence };
  if (loc.suburb?.trim() && isPlausibleSuburb(loc.suburb)) {
    result.suburb = loc.suburb.trim();
  } else if (loc.suburb?.trim() && typeof console !== 'undefined' && console.log) {
    console.log('[plan-location] rejected suburb', loc.suburb?.slice(0, 50));
  }
  if (loc.postcode?.trim() && /^\d{4}$/.test(loc.postcode.trim())) {
    result.postcode = loc.postcode.trim();
  }
  if (loc.state?.trim() && STATE_ABBREVS.includes(loc.state.trim().toUpperCase())) {
    result.state = loc.state.trim();
  }
  if (loc.address_text?.trim()) {
    const addr = loc.address_text.trim();
    if (isPlausibleAddressText(addr)) {
      result.address_text = addr;
    } else if (typeof console !== 'undefined' && console.log) {
      console.log('[plan-location] rejected address_text', addr.slice(0, 80));
    }
  }
  if (!result.suburb && !result.address_text && !result.postcode) return null;
  result.confidence = result.confidence ?? 0.5;
  if (typeof console !== 'undefined' && console.log) {
    console.log('[plan-location] final accepted location', { address_text: result.address_text?.slice(0, 50), suburb: result.suburb, postcode: result.postcode });
  }
  return result;
}

export type InferredLocation = DetectedLocation;

/**
 * Infer location from plan text using regex and heuristics.
 * Looks for: site details, address:, permit address, suburb names, postcodes, state abbreviations.
 */
export function inferLocationFromPlanText(text: string): InferredLocation | null {
  if (!text || text.length < 20) return null;

  const result: InferredLocation = {};
  let confidence = 0;

  // Full address pattern: "6 Aloe Court, South Morang" or "6 Aloe Court South Morang"
  const fullAddrRe = new RegExp(
    `(\\d+\\s+[A-Za-z\\s]+(?:${STREET_TYPES.join('|')})[,\\s]+([A-Za-z\\s]+?)(?:\\s+(VIC|NSW|QLD|WA|SA|TAS|ACT|NT))?(?:\\s+(\\d{4}))?)\\b`,
    'i'
  );
  const fullMatch = text.match(fullAddrRe);
  if (fullMatch) {
    const addr = fullMatch[1].trim();
    if (isPlausibleAddressText(addr)) {
      result.address_text = addr;
      const suburbPart = fullMatch[2]?.trim();
      if (suburbPart && !STATE_ABBREVS.includes(suburbPart.toUpperCase()) && isPlausibleSuburb(suburbPart)) {
        result.suburb = suburbPart;
        confidence = 0.85;
      }
      if (fullMatch[3]) result.state = fullMatch[3].trim();
      if (fullMatch[4]) result.postcode = fullMatch[4].trim();
      confidence = Math.max(confidence, 0.9);
    }
  }

  // Simpler: "Address:" or "Site address:" or "Permit address:" followed by address
  if (!result.address_text) {
    const addrLabelRe = /(?:address|site\s+address|permit\s+address|proposal\s+address)[:\s]+([^\n]{10,80})/i;
    const labelMatch = text.match(addrLabelRe);
    if (labelMatch) {
      const addr = labelMatch[1].trim();
      if (isPlausibleAddressText(addr)) {
        result.address_text = addr;
        confidence = Math.max(confidence, 0.7);
        const suburbFromAddr = addr.match(/,?\s*([A-Za-z\s]+?)(?:\s+(VIC|NSW|QLD|WA|SA|TAS|ACT|NT))?(?:\s+(\d{4}))?$/);
        if (suburbFromAddr) {
          const s = suburbFromAddr[1]?.trim();
          if (s && !STATE_ABBREVS.includes(s.toUpperCase()) && isPlausibleSuburb(s)) result.suburb = s;
          if (suburbFromAddr[3]) result.postcode = suburbFromAddr[3].trim();
          if (suburbFromAddr[2]) result.state = suburbFromAddr[2].trim();
        }
      }
    }
  }

  // Suburb + postcode: "South Morang VIC 3752" or "South Morang, VIC 3752"
  if (!result.suburb) {
    for (const sub of KNOWN_SUBURBS) {
      const re = new RegExp(`\\b(${sub.replace(/\s/g, '\\s')})(?:\\s*[,]?\\s*(VIC|NSW|QLD|WA|SA|TAS|ACT|NT))?\\s*(\\d{4})?`, 'i');
      const m = text.match(re);
      if (m) {
        result.suburb = m[1].trim();
        if (m[3]) result.postcode = m[3].trim();
        if (m[2]) result.state = m[2].trim();
        confidence = Math.max(confidence, result.postcode ? 0.85 : 0.6);
        break;
      }
    }
  }

  // Standalone 4-digit postcode (Australian postcodes)
  if (!result.postcode) {
    const postcodeRe = /\b(3\d{3}|2\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|0\d{3})\b/;
    const pcMatch = text.match(postcodeRe);
    if (pcMatch && result.suburb) {
      result.postcode = pcMatch[1];
      confidence = Math.max(confidence, 0.75);
    }
  }

  // Street name only: "Aloe Court" or "6 Pleasant Road" – use as address_text if nothing else
  if (!result.address_text) {
    const streetRe = new RegExp(`(\\d+\\s+[A-Za-z]+\\s+(?:${STREET_TYPES.join('|')}))\\b`, 'i');
    const streetMatch = text.match(streetRe);
    if (streetMatch) {
      const addr = streetMatch[1].trim();
      if (isPlausibleAddressText(addr)) {
        result.address_text = addr;
        confidence = Math.max(confidence, 0.5);
      }
    }
  }

  if (!result.suburb && !result.address_text) return null;

  result.confidence = confidence;
  if (typeof console !== 'undefined' && console.log) {
    console.log('[plan-location] inferred location', { address_text: result.address_text?.slice(0, 50), suburb: result.suburb, postcode: result.postcode });
  }
  return result;
}
