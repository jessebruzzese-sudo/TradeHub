import type { TenderAIDraft, SuggestedTradeWithScope, DetectedLocation } from '@/lib/ai/tender-draft-schema';
import { getFallbackScope, normalizeTradeName } from '@/lib/ai/trade-scope-fallbacks';
import { validateTradeName } from '@/lib/trade-validation';
import type { InferredTrade } from '@/lib/ai/plan-trade-inference';
import { inferLocationFromPlanText, cleanDetectedLocation } from '@/lib/ai/plan-location-inference';
import { detectRoomsFromPlanText, detectBuildingElements } from '@/lib/ai/plan-room-detection';
import { detectDrainageFromPlanText } from '@/lib/ai/plan-drainage-detection';
import { buildPlanSummary } from '@/lib/ai/plan-summary-builder';
import { computePlanConfidence, buildDetectedSignals } from '@/lib/ai/plan-confidence';

const FILLER_PHRASES = [
  /\bworks?\s+as\s+required\b/gi,
  /\bgeneral\s+works?\b/gi,
  /\bscope\s+to\s+be\s+confirmed\b/gi,
  /\bno\s+scope\s+detected\b/gi,
  /\bincluding\s+but\s+not\s+limited\s+to\b/gi,
  /\betc\.?\s*$/gi,
  /\band\s+associated\s+works\b/gi,
  /\bplease\s+quote\s+accordingly\b/gi,
  /\bas\s+required\b/gi,
  /\bas\s+shown\s+on\s+plans\b/gi,
  /\bto\s+be\s+confirmed\b/gi,
];

const WEAK_PROJECT_NAMES = [
  /^project\s+(tender|works?|overview)\s*$/i,
  /^construction\s+project\s*$/i,
  /^generated\s+tender\s+draft\s*$/i,
  /^draft\s+tender\s*$/i,
  /^tender\s+draft\s*$/i,
  /^new\s+project\s*$/i,
];

const MAX_PROJECT_NAME = 80;
const MAX_PROJECT_DESC = 500;
const MAX_SCOPE = 220;
/** Default cap: keep strongest 8–12 trades. */
const DEFAULT_MAX_TRADES = 12;
/** Absolute max when there is strong support across many trades. */
const ABSOLUTE_MAX_TRADES = 15;
/** Min confidence when trade has evidence. */
const MIN_CONFIDENCE_WITH_EVIDENCE = 0.2;
/** Min confidence when trade has no evidence (prune more aggressively). */
const MIN_CONFIDENCE_NO_EVIDENCE = 0.35;
/** Confidence threshold to allow extending beyond DEFAULT_MAX up to ABSOLUTE_MAX. */
const STRONG_SUPPORT_THRESHOLD = 0.5;

function cleanText(s: string): string {
  if (!s || typeof s !== 'string') return '';
  let t = s.trim();
  for (const re of FILLER_PHRASES) {
    t = t.replace(re, '').trim();
  }
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/[,;]\s*[,;]+/g, ',').trim();
  t = t.replace(/\.\s*\.+/g, '.').trim();
  t = t.replace(/^[,.\s\-–—]+|[,\s\-–—]+$/g, '').trim();
  return t;
}

function isWeakProjectName(name: string): boolean {
  const n = name.trim();
  if (!n || n.length < 5) return true;
  return WEAK_PROJECT_NAMES.some((re) => re.test(n));
}

/** Replace "single storey dwellings" / "single-storey dwellings" with "residential dwellings". Case-insensitive. */
function scrubSingleStoreyFromDescription(desc: string): string {
  if (!desc || typeof desc !== 'string') return desc;
  return desc
    .replace(/\bsingle\s*[- ]?\s*storey\s*dwellings\b/gi, 'residential dwellings')
    .replace(/\bsingle\s*[- ]?\s*storey\s*dwelling\b/gi, 'residential dwelling');
}

/** True if description mentions N dwellings with "single storey" (e.g. "2 single storey dwellings"). */
function descriptionClaimsMultiDwellingSingleStorey(desc: string): boolean {
  if (!desc || typeof desc !== 'string') return false;
  return /\d+\s+single\s*[- ]?storey\s*dwellings/i.test(desc);
}

/** Neutral multi-dwelling description when storey evidence is uncertain. No storey wording. */
function buildNeutralMultiDwellingDescription(
  dwellingCount: number,
  detectedLocation: DetectedLocation | null
): string {
  const loc = detectedLocation?.suburb?.trim() ?? detectedLocation?.address_text?.trim();
  const inLoc = loc ? ` in ${loc}` : '';
  return `This tender relates to construction works across ${dwellingCount} residential dwellings${inLoc}, including all relevant trade packages as inferred from the provided plans.`;
}

function isWeakScope(scope: string): boolean {
  const s = cleanText(scope);
  if (!s || s.length < 15) return true;
  const lower = s.toLowerCase();
  return (
    lower.includes('no scope') ||
    lower.includes('scope to be confirmed') ||
    lower.includes('works as required') ||
    lower.includes('general works') ||
    lower.length < 30
  );
}

/** Extract likely site/location hints from plan text (e.g. "Aloe Court", "South Morang"). */
function extractSiteHints(text: string): { siteName?: string; suburb?: string } {
  const hints: { siteName?: string; suburb?: string } = {};
  if (!text || text.length < 20) return hints;

  const addrMatch = text.match(/([A-Za-z\s]+(?:Court|Street|Drive|Road|Avenue|Lane|Place)[,\s]+[A-Za-z\s]+)/i);
  if (addrMatch) {
    const parts = addrMatch[1].split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 1) hints.siteName = parts[0];
    if (parts.length >= 2) hints.suburb = parts.slice(1).join(' ');
  }

  if (!hints.suburb) {
    const suburbMatch = text.match(/\b(South Morang|North Melbourne|Melbourne|Sydney|Brisbane|Perth|Adelaide|Canberra|Bulleen)\b/i);
    if (suburbMatch) hints.suburb = suburbMatch[1];
  }
  if (!hints.siteName) {
    const siteMatch = text.match(/\b([A-Za-z]+\s+Court|[A-Za-z]+\s+Street|[A-Za-z]+\s+Drive)\b/);
    if (siteMatch) hints.siteName = siteMatch[1];
  }
  return hints;
}

function buildFallbackProjectName(
  parsed: Partial<TenderAIDraft>,
  inferredTrades: InferredTrade[],
  siteHints: { siteName?: string; suburb?: string },
  detectedLocation?: DetectedLocation | null,
  dwellingCount: number = 1,
  _dwellingLabels?: string[],
  suburbHint?: string
): string {
  const desc = (parsed.project_description ?? parsed.summary ?? '').toLowerCase();
  const projectType =
    dwellingCount >= 2
      ? `Residential works – ${dwellingCount} dwellings`
      : desc.includes('renovation')
        ? 'Renovation'
        : desc.includes('extension')
          ? 'Extension'
          : 'New dwelling';

  // When detected_location exists, keep project_name short – location goes in Tender Location section
  const loc = detectedLocation;
  const hasLoc = loc && (loc.suburb || loc.address_text);
  const suburb = suburbHint ?? loc?.suburb ?? siteHints.suburb;

  if (dwellingCount >= 2) {
    if (siteHints.siteName) return `${projectType}, ${siteHints.siteName}`.slice(0, MAX_PROJECT_NAME);
    if (suburb) return `${projectType}, ${suburb}`.slice(0, MAX_PROJECT_NAME);
    return `${projectType}`.slice(0, MAX_PROJECT_NAME);
  }

  if (hasLoc) {
    const sitePart = loc!.address_text?.match(/^[\d\s]+([A-Za-z]+\s+(?:Court|Street|Drive|Road|Avenue|Lane|Place)\b)/i)?.[1]?.trim()
      ?? siteHints.siteName
      ?? (loc!.address_text && loc!.address_text.length < 40 ? loc!.address_text : null);
    if (sitePart) {
      return `${projectType} – ${sitePart}`.slice(0, MAX_PROJECT_NAME);
    }
    if (loc!.suburb) {
      return `${projectType} – ${loc!.suburb}`.slice(0, MAX_PROJECT_NAME);
    }
  }

  if (siteHints.siteName && siteHints.suburb) {
    return `${projectType} – ${siteHints.siteName}, ${siteHints.suburb}`.slice(0, MAX_PROJECT_NAME);
  }
  if (siteHints.siteName) {
    return `${projectType} – ${siteHints.siteName}`.slice(0, MAX_PROJECT_NAME);
  }
  if (siteHints.suburb) {
    return `${projectType} – ${siteHints.suburb}`.slice(0, MAX_PROJECT_NAME);
  }

  const topTrades = inferredTrades.slice(0, 3).map((t) => t.trade);
  if (topTrades.length > 0) {
    return `Residential new build – ${topTrades.join(', ')}`.slice(0, MAX_PROJECT_NAME);
  }
  return 'Single dwelling construction';
}

function buildFallbackDescription(
  parsed: Partial<TenderAIDraft>,
  inferredTrades: InferredTrade[],
  siteHints: { siteName?: string; suburb?: string },
  dwellingCount: number = 1,
  storeySupportsDouble: boolean = false,
  likelyStoreyLabel?: 'single storey' | 'double storey' | 'triple storey' | 'mixed/uncertain',
  hasStrongSingleStoreyEvidence: boolean = false
): string {
  const loc = [siteHints.siteName, siteHints.suburb].filter(Boolean).join(', ');
  const tradeList = inferredTrades.slice(0, 5).map((t) => t.trade).join(', ');
  const multiDwelling = dwellingCount >= 2;
  // For multi-dwelling: only use storey wording when confidently known. Never assume single storey.
  const storeyPhrase = multiDwelling
    ? likelyStoreyLabel === 'triple storey'
      ? 'triple-storey '
      : likelyStoreyLabel === 'double storey' || storeySupportsDouble
        ? 'double-storey '
        : likelyStoreyLabel === 'single storey' && hasStrongSingleStoreyEvidence
          ? 'single-storey '
          : '' // mixed/uncertain or undefined or weak single-storey evidence → neutral "residential dwellings"
    : likelyStoreyLabel === 'triple storey'
      ? 'triple storey '
      : likelyStoreyLabel === 'double storey' || storeySupportsDouble
        ? 'double storey '
        : likelyStoreyLabel === 'single storey'
          ? 'single storey '
          : storeySupportsDouble
            ? 'double storey '
            : '';

  if (multiDwelling) {
    const dwellingPhrase = `construction works across ${dwellingCount} ${storeyPhrase}residential dwellings`;
    if (loc && tradeList) {
      return `This tender relates to ${dwellingPhrase} in ${loc}, including framing, plumbing, electrical, roofing and associated residential trade packages as indicated on the plans. Relevant trades should review the uploaded drawings and quote on the applicable scope.`;
    }
    if (tradeList) {
      return `This tender relates to ${dwellingPhrase}. Plans indicate ${tradeList.toLowerCase()} and associated construction works across all dwellings. Relevant trades should review the uploaded drawings and quote on the applicable scope.`;
    }
    return `This tender relates to ${dwellingPhrase} as per the uploaded plans. Relevant trades should review the drawings and quote on applicable scope.`;
  }

  if (loc && tradeList) {
    return `This tender relates to a new residential dwelling at ${loc}. Plans indicate ${tradeList.toLowerCase()} and associated residential construction works. Relevant trades should review the uploaded drawings and quote on the applicable scope.`;
  }
  if (tradeList) {
    return `This tender relates to a new residential dwelling. Plans indicate ${tradeList.toLowerCase()} and associated residential construction works. Relevant trades should review the uploaded drawings and quote on the applicable scope.`;
  }
  return 'This tender relates to residential construction works as per the uploaded plans. Relevant trades should review the drawings and quote on applicable scope.';
}

export type CleanDraftResult = {
  draft: TenderAIDraft;
  fallbackScopesApplied: string[];
  tradesPruned: string[];
};

/** Shorten project_name when it contains full address that belongs in detected_location. */
function shortenProjectNameIfLocationEmbedded(
  name: string,
  detectedLocation?: DetectedLocation | null
): string {
  if (!name || !detectedLocation) return name;
  const loc = detectedLocation;
  const suburb = loc.suburb?.trim();
  const addr = loc.address_text?.trim();
  if (!suburb && !addr) return name;

  // If name ends with ", South Morang" or "South Morang, VIC 3752", trim to keep it short
  if (suburb && name.includes(suburb)) {
    const beforeSuburb = name.split(suburb)[0].replace(/[,–—\s]+$/, '').trim();
    if (beforeSuburb.length >= 15) {
      return `${beforeSuburb} – ${suburb}`.slice(0, MAX_PROJECT_NAME);
    }
  }
  return name;
}

export type CleanDraftOptions = {
  detectedDwellingCount?: number;
  detectedDwellingLabels?: string[];
  /** When true, prefer double-storey wording in fallbacks (from grouped floor-plan evidence). */
  storeyEvidenceSupportsDouble?: boolean;
  /** Project-level storey label from grouped dwelling analysis. Use for multi-dwelling. */
  likelyStoreyLabel?: 'single storey' | 'double storey' | 'triple storey' | 'mixed/uncertain';
  /** For multi-dwelling: only allow "single storey" in description when true. Otherwise use neutral. */
  hasStrongSingleStoreyEvidence?: boolean;
};

export function cleanTenderDraft(
  parsed: TenderAIDraft,
  inferredTrades: InferredTrade[],
  combinedPlanText: string,
  pdfTextLimited: boolean,
  detectedDwellingCount?: number,
  options?: CleanDraftOptions
): CleanDraftResult {
  const siteHints = extractSiteHints(combinedPlanText);
  const fallbackScopesApplied: string[] = [];
  const tradesPruned: string[] = [];

  const roomCounts = detectRoomsFromPlanText(combinedPlanText);
  const building = detectBuildingElements(combinedPlanText);
  const drainage = detectDrainageFromPlanText(combinedPlanText);

  const opts = typeof options === 'object' ? options : {};
  let dwellingCount = detectedDwellingCount ?? opts.detectedDwellingCount ?? 1;
  // If AI implies multi-dwelling, treat as multi-dwelling for storey logic
  const aiDwellingCount = parsed.detected_dwelling_count;
  if (typeof aiDwellingCount === 'number' && aiDwellingCount >= 2) dwellingCount = Math.max(dwellingCount, aiDwellingCount);
  const dwellingLabels = opts.detectedDwellingLabels ?? [];
  /** Use grouped storey evidence when multi-dwelling; otherwise building.floors. */
  const likelyStoreyLabel = opts.likelyStoreyLabel;
  /** For multi-dwelling: only trust "single storey" when we have strong proof. Otherwise treat as mixed/uncertain. */
  const hasStrongSingleStoreyEvidence = opts.hasStrongSingleStoreyEvidence === true;
  const storeySupportsDouble =
    dwellingCount >= 2
      ? (likelyStoreyLabel === 'double storey' || likelyStoreyLabel === 'triple storey' || opts.storeyEvidenceSupportsDouble === true)
      : (opts.storeyEvidenceSupportsDouble ?? building.floors >= 2);

  let planSummary = buildPlanSummary({
    roomDetection: roomCounts,
    inferredTrades,
    planText: combinedPlanText,
    building,
    drainage,
    dwellingCount,
    storeySupportsDouble: storeySupportsDouble || building.floors >= 2,
    likelyStoreyLabel,
  });

  // Safety net: ensure summary never shows double/triple storey when canonical floors === 1 (single-dwelling only)
  if (building.floors === 1 && dwellingCount === 1 && planSummary.summaryItems.length > 0) {
    planSummary = {
      summaryItems: planSummary.summaryItems.map((item) =>
        /double\s+storey|triple\s+storey|two-?storey/i.test(item)
          ? 'Single storey dwelling'
          : item
      ),
    };
  }

  // Protective filter: for multi-dwelling, remove "Single storey dwelling(s)" unless storey is confidently single
  if (dwellingCount >= 2 && likelyStoreyLabel !== 'single storey') {
    planSummary = {
      summaryItems: planSummary.summaryItems.filter(
        (item) => !/single\s*[- ]?storey\s*dwelling(s)?/i.test(item.trim())
      ),
    };
  }

  const fallbackContext = { roomCounts, building, dwellingCount };

  const inferredLoc = inferLocationFromPlanText(combinedPlanText);
  const planConfidence = computePlanConfidence({
    extractedTextLength: combinedPlanText.length,
    locationDetected: !!(
      parsed.detected_location?.suburb ||
      parsed.detected_location?.address_text ||
      (inferredLoc && (inferredLoc.suburb || inferredLoc.address_text))
    ),
    roomCounts,
    building,
    drainage,
    inferredTradesCount: inferredTrades.length,
  });

  let detectedSignals = buildDetectedSignals({
    roomCounts,
    building,
    drainage,
    inferredTrades,
    planText: combinedPlanText,
    detectedLocation: parsed.detected_location,
    dwellingCount,
  });

  // For single-storey plans, omit floor-level signals that would confuse the user
  if (building.floors === 1) {
    detectedSignals = detectedSignals.filter(
      (s) => !/^(first|second|1st|2nd)\s+floor\s+plan$/i.test(s.trim())
    );
  }

  // Resolve detected_location: AI output or deterministic inference
  // Run through plausibility filter to reject garbage (e.g. "5 The threshold of an internal doorway to")
  let detectedLocation: DetectedLocation | null = null;
  const aiLoc = parsed.detected_location;
  if (aiLoc && (aiLoc.suburb || aiLoc.address_text) && (aiLoc.confidence ?? 0.5) >= 0.3) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[generate-from-plans] raw AI location', { address_text: aiLoc.address_text?.slice(0, 80), suburb: aiLoc.suburb, postcode: aiLoc.postcode });
    }
    const cleaned = cleanDetectedLocation(aiLoc);
    if (cleaned && (cleaned.suburb || cleaned.address_text || cleaned.postcode)) {
      detectedLocation = cleaned;
    }
  }
  if (!detectedLocation) {
    const inferred = inferLocationFromPlanText(combinedPlanText);
    if (inferred) detectedLocation = inferred;
  }

  let projectName = cleanText(parsed.project_name ?? '');
  if (projectName.length > MAX_PROJECT_NAME) {
    projectName = projectName.slice(0, MAX_PROJECT_NAME).trim();
  }
  if (detectedLocation) {
    projectName = shortenProjectNameIfLocationEmbedded(projectName, detectedLocation);
  }
  if (isWeakProjectName(projectName)) {
    projectName = buildFallbackProjectName(
      parsed,
      inferredTrades,
      siteHints,
      detectedLocation,
      dwellingCount,
      dwellingLabels,
      siteHints.suburb ?? detectedLocation?.suburb ?? undefined
    );
  }

  let projectDescription = cleanText(parsed.project_description ?? parsed.summary ?? '');
  if (typeof console !== 'undefined' && console.log) {
    console.log('[generate-from-plans] raw AI description', (parsed.project_description ?? parsed.summary ?? '')?.slice(0, 120));
  }
  if (projectDescription.length > MAX_PROJECT_DESC) {
    projectDescription = projectDescription.slice(0, MAX_PROJECT_DESC).trim();
  }
  if (!projectDescription || projectDescription.length < 50) {
    projectDescription = buildFallbackDescription(
      parsed,
      inferredTrades,
      siteHints,
      dwellingCount,
      storeySupportsDouble,
      likelyStoreyLabel,
      hasStrongSingleStoreyEvidence
    );
    if (typeof console !== 'undefined' && console.log) {
      console.log('[generate-from-plans] after fallback description', projectDescription?.slice(0, 120));
    }
  }

  // HARD override: for multi-dwelling with uncertain storey, use neutral template (overrides AI and fallback)
  // Only allow storey-specific wording when we have strong proof; otherwise use neutral
  const storeyConfidentlySingleForMulti =
    dwellingCount >= 2 && likelyStoreyLabel === 'single storey' && hasStrongSingleStoreyEvidence;
  const useNeutralMultiDwelling =
    dwellingCount >= 2 &&
    (likelyStoreyLabel === 'mixed/uncertain' ||
      likelyStoreyLabel === undefined ||
      (likelyStoreyLabel === 'single storey' && !hasStrongSingleStoreyEvidence));
  if (useNeutralMultiDwelling) {
    projectDescription = buildNeutralMultiDwellingDescription(dwellingCount, detectedLocation);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[generate-from-plans] hard override: neutral multi-dwelling description', projectDescription?.slice(0, 120));
    }
  }

  // Correct storey wording when canonical detection disagrees with AI output (skip when neutral override used)
  if (!useNeutralMultiDwelling) {
    const groupedSupportsDouble = dwellingCount >= 2 && (likelyStoreyLabel === 'double storey' || likelyStoreyLabel === 'triple storey');
    const shouldDowngradeToSingle = dwellingCount === 1 && building.floors === 1 && !groupedSupportsDouble;
    if (shouldDowngradeToSingle) {
      projectDescription = projectDescription
        .replace(/\btwo-?storey\b/gi, 'single-storey')
        .replace(/\bdouble-?storey\b/gi, 'single storey')
        .replace(/\btwo\s+storey\b/gi, 'single storey')
        .replace(/\bdouble\s+storey\b/gi, 'single storey')
        .replace(/\b2-?storey\b/gi, 'single storey');
    } else if (building.floors >= 2 || (dwellingCount >= 2 && storeySupportsDouble)) {
      projectDescription = projectDescription
        .replace(/\bsingle-?storey\b/gi, 'double-storey')
        .replace(/\bsingle\s+storey\b/gi, 'double storey');
    }
  }

  // Protective cleanup: for multi-dwelling, remove wrong "single storey" wording unless clearly proven
  const storeyConfidentlySingle = dwellingCount >= 2 && likelyStoreyLabel === 'single storey' && hasStrongSingleStoreyEvidence;
  if (dwellingCount >= 2 && !storeyConfidentlySingle && !useNeutralMultiDwelling) {
    projectDescription = scrubSingleStoreyFromDescription(projectDescription);
  }
  if (typeof console !== 'undefined' && console.log) {
    console.log('[generate-from-plans] after cleanup description', projectDescription?.slice(0, 120));
  }

  let rawTrades = parsed.suggested_trades_with_scope ?? [];
  if (rawTrades.length === 0 && inferredTrades.length > 0) {
    rawTrades = inferredTrades.slice(0, ABSOLUTE_MAX_TRADES).map((t) => ({
      trade: t.trade,
      scope: '',
      confidence: t.confidence,
      evidence: t.evidence,
    }));
  }
  const withFallbacks: SuggestedTradeWithScope[] = [];
  const invalidTradesDropped: string[] = [];

  if (
    (drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters) &&
    !rawTrades.some((t) => normalizeTradeName(t.trade) === 'Roof plumbing / stormwater')
  ) {
    rawTrades.push({
      trade: 'Roof plumbing / stormwater',
      scope: '',
      confidence: 0.7,
      evidence: drainage.detectedDrainageSignals,
    });
  }

  for (const t of rawTrades) {
    const trade = normalizeTradeName(t.trade);
    if (!trade) {
      if (t.trade?.trim()) invalidTradesDropped.push(t.trade.trim());
      continue; // Drop trades that don't map to canonical TradeHub list
    }
    let scope = cleanText(t.scope ?? '');
    if (isWeakScope(scope)) {
      const fallback = getFallbackScope(trade, fallbackContext);
      if (fallback) {
        scope = fallback;
        fallbackScopesApplied.push(trade);
      }
    }
    if (scope.length > MAX_SCOPE) {
      scope = scope.slice(0, MAX_SCOPE).trim();
      const lastSpace = scope.lastIndexOf(' ');
      if (lastSpace > 150) scope = scope.slice(0, lastSpace);
    }
    withFallbacks.push({
      trade,
      scope: scope || (getFallbackScope(trade, fallbackContext) ?? 'Scope as per plans.'),
      confidence: t.confidence ?? 0.5,
      evidence: t.evidence ?? [],
    });
  }

  // Deduplicate by canonical trade name: keep highest confidence, best scope
  const byTrade = new Map<string, SuggestedTradeWithScope>();
  for (const t of withFallbacks) {
    const existing = byTrade.get(t.trade);
    if (!existing || (t.confidence ?? 0) > (existing.confidence ?? 0)) {
      byTrade.set(t.trade, t);
    } else if ((t.confidence ?? 0) === (existing.confidence ?? 0) && (t.scope?.length ?? 0) > (existing.scope?.length ?? 0)) {
      byTrade.set(t.trade, t);
    }
  }
  const deduped = Array.from(byTrade.values());

  /** Trades implied by building/room signals – allow slightly lower confidence. */
  const impliedTrades = new Set<string>();
  if (roomCounts.bathrooms > 0 || roomCounts.ensuites > 0 || roomCounts.kitchens > 0 || roomCounts.laundries > 0) {
    impliedTrades.add('Waterproofing');
    impliedTrades.add('Tiling');
  }
  if (building.floors >= 1 || roomCounts.bathrooms > 0) {
    impliedTrades.add('Painting & Decorating');
  }

  const ranked = deduped
    .filter((t) => {
      const conf = t.confidence ?? 0;
      const hasEvidence = Array.isArray(t.evidence) && t.evidence.length > 0;
      const minConf = hasEvidence ? MIN_CONFIDENCE_WITH_EVIDENCE : MIN_CONFIDENCE_NO_EVIDENCE;
      if (conf >= minConf) return true;
      if (impliedTrades.has(t.trade) && conf >= 0.2) return true;
      return false;
    })
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  const strongCount = ranked.filter((t) => (t.confidence ?? 0) >= STRONG_SUPPORT_THRESHOLD).length;
  const maxToKeep =
    strongCount >= DEFAULT_MAX_TRADES ? Math.min(ranked.length, ABSOLUTE_MAX_TRADES) : DEFAULT_MAX_TRADES;

  const kept = ranked.slice(0, maxToKeep);
  const pruned = ranked.slice(maxToKeep).map((t) => t.trade);
  tradesPruned.push(...pruned);

  if (typeof console !== 'undefined' && console.log) {
    console.log('[generate-from-plans] detectedDwellingCount', dwellingCount);
    console.log('[generate-from-plans] likelyStoreyLabel', likelyStoreyLabel);
    console.log('[generate-from-plans] description before cleanup', parsed.project_description ?? parsed.summary ?? '');
    console.log('[generate-from-plans] description after cleanup', projectDescription);
    console.log('[generate-from-plans] final summaryItems', planSummary.summaryItems);
    console.log('[generate-from-plans] building detection', {
      floors: building.floors,
      hasGroundFloor: building.hasGroundFloor,
      hasFirstFloor: building.hasFirstFloor,
      hasSecondFloor: building.hasSecondFloor,
    });
    console.log('[generate-from-plans] raw trade count', rawTrades.length);
    console.log('[generate-from-plans] after dedup', deduped.length);
    console.log('[generate-from-plans] cleaned trade count', kept.length);
    console.log('[generate-from-plans] kept trades', kept.map((t) => t.trade));
    if (pruned.length > 0) {
      console.log('[generate-from-plans] pruned trades', pruned);
    }
  }

  const tradeScopes: Record<string, string[]> = {};
  for (const t of kept) {
    if (t.scope?.trim()) tradeScopes[t.trade] = [t.scope.trim()];
  }

  let notes = parsed.notes?.trim() ?? null;
  if (pdfTextLimited && !notes) {
    notes = 'Plan text was limited, so this draft is a best-effort summary based on extracted text and plan keywords.';
  }
  if (!pdfTextLimited && notes && notes.toLowerCase().includes('limited')) {
    notes = null;
  }
  if (invalidTradesDropped.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[clean-tender-draft] Invalid AI trade names dropped:', invalidTradesDropped);
    }
    if (kept.length === 0) {
      const fallbackMsg =
        "We couldn't confidently map trades from the plans. Please review and select from TradeHub's existing trade list.";
      notes = notes ? `${notes} ${fallbackMsg}` : fallbackMsg;
    }
  }

  // Final defensive scrub: for multi-dwelling with uncertain storey, remove any remaining single-storey wording
  const needsFinalScrub = dwellingCount >= 2 && !storeyConfidentlySingleForMulti;
  if (needsFinalScrub) {
    const descBefore = projectDescription;
    projectDescription = scrubSingleStoreyFromDescription(projectDescription);
    if (likelyStoreyLabel === 'mixed/uncertain' || likelyStoreyLabel === undefined) {
      if (/single\s*[- ]?storey/i.test(projectDescription)) {
        projectDescription = buildNeutralMultiDwellingDescription(dwellingCount, detectedLocation);
        if (typeof console !== 'undefined' && console.log) {
          console.log('[generate-from-plans] final override: forced neutral template (single storey still present)');
        }
      }
    }
    planSummary = {
      summaryItems: planSummary.summaryItems.filter(
        (i) => !/single\s*[- ]?storey\s*dwelling(s)?/i.test(i.trim())
      ),
    };
    if (typeof console !== 'undefined' && console.log) {
      console.log('[generate-from-plans] detectedDwellingCount', dwellingCount);
      console.log('[generate-from-plans] likelyStoreyLabel', likelyStoreyLabel);
      console.log('[generate-from-plans] description before final scrub', descBefore?.slice(0, 250));
      console.log('[generate-from-plans] final returned description', projectDescription?.slice(0, 250));
    }
  }

  // HARD final override: for multi-dwelling without strong single-storey proof, never return "single storey"
  if (dwellingCount >= 2 && !storeyConfidentlySingleForMulti && /single\s*[- ]?storey/i.test(projectDescription)) {
    projectDescription = buildNeutralMultiDwellingDescription(dwellingCount, detectedLocation);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[generate-from-plans] final override: forced neutral (single storey still present before return)');
    }
  }

  // Content-based scrub: description says "N single storey dwellings" (e.g. from AI when grouping missed multi-dwelling)
  if (descriptionClaimsMultiDwellingSingleStorey(projectDescription)) {
    projectDescription = scrubSingleStoreyFromDescription(projectDescription);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[generate-from-plans] content-based scrub: replaced multi-dwelling single-storey wording');
    }
  }
  if (typeof console !== 'undefined' && console.log) {
    console.log('[generate-from-plans] final returned description', projectDescription?.slice(0, 250));
  }

  const draft: TenderAIDraft = {
    project_name: projectName || null,
    summary: projectDescription,
    project_description: projectDescription,
    suggested_trades: kept.map((t) => t.trade),
    suggested_trades_with_scope: kept,
    trade_scopes: tradeScopes,
    estimated_duration_days: parsed.estimated_duration_days ?? null,
    notes,
    confirmed_from_plans: [],
    questions_to_confirm: [],
    assumptions: [],
    inclusions: [],
    exclusions: [],
    timing_notes: [],
    site_access_notes: [],
    quantities_and_schedules: parsed.quantities_and_schedules ?? [],
    quote_checklist: (() => {
      const raw = parsed.quote_checklist ?? {};
      const filtered: Record<string, string[]> = {};
      for (const [trade, items] of Object.entries(raw)) {
        const canonical = validateTradeName(trade);
        if (canonical && Array.isArray(items)) filtered[canonical] = items;
      }
      return filtered;
    })(),
    detected_location: detectedLocation ?? undefined,
    detected_rooms: roomCounts,
    plan_summary: planSummary.summaryItems.length > 0 ? { summaryItems: planSummary.summaryItems } : undefined,
    plan_confidence: planConfidence,
    detected_signals: detectedSignals.length > 0 ? detectedSignals : undefined,
    detected_building: building,
    detected_dwelling_count: parsed.detected_dwelling_count ?? dwellingCount ?? null,
    detected_dwelling_labels: dwellingLabels.length > 0 ? dwellingLabels : (parsed.detected_dwelling_labels ?? undefined),
    likely_storey_label: likelyStoreyLabel ?? null,
  };

  return { draft, fallbackScopesApplied, tradesPruned };
}
