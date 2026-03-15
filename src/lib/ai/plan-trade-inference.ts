/**
 * Keyword-based trade inference from construction plan text.
 * Used when text extraction is weak - provides hints to the AI.
 */

export type InferredTrade = {
  trade: string;
  confidence: number;
  evidence: string[];
};

import { normalizeTradeName } from '@/lib/ai/trade-scope-fallbacks';

/** Map TradeHub trade category names to plan keywords (lowercase). */
const TRADE_KEYWORDS: Record<string, string[]> = {
  Plumbing: [
    'toilet', 'wc', 'vanity', 'basin', 'shower', 'floor waste', 'hot water', 'sewer', 'stormwater',
    'drain', 'sanitary', 'stack', 'plumbing', 'water supply', 'sewerage', 'gpo', 'tap', 'mixer',
    'hws', 'hot water unit', 'cold water', 'waste pipe', 'vent', 'trap',
  ],
  Electrical: [
    'gpo', 'switch', 'lighting', 'downlight', 'smoke alarm', 'data point', 'nbn', 'exhaust fan',
    'meter box', 'power point', 'electrical', 'switchboard', 'cabling', 'light switch',
    'power outlet', 'rcd', 'circuit', 'conduit', 'cable', 'led', 'light fitting',
  ],
  Carpentry: [
    'timber framing', 'stud wall', 'frame', 'joist', 'truss', 'door frame', 'window frame',
    'carpentry', 'framing', 'lintel', 'bearer', 'floor joist', 'roof truss', 'wall frame',
    'subfloor', 'flooring', 'skirting', 'architrave', 'fix-out', 'fix out',
  ],
  Roofing: [
    'roof', 'flashing', 'gutter', 'downpipe', 'ridge', 'cladding', 'roof sheet',
    'roofing', 'metal roof', 'tile roof', 'sarking', 'ridge capping', 'valley',
    'eaves', 'fascia', 'soffit',
  ],
  'Roof plumbing / stormwater': [
    'dp', 'downpipe', 'stormwater', 'storm water', 'gutter', 'rainwater',
    'rain head', 'rainwater head', 'lpod', 'legal point of discharge',
  ],
  Concreting: [
    'slab', 'footing', 'footing system', 'concrete', 'garage slab', 'porch slab',
    'concreting', 'strip footing', 'pad footing', 'raft slab', 'screed',
    'edge beam', 'stump', 'pier',
  ],
  Tiling: [
    'tiles', 'shower base', 'wet area tiles', 'splashback', 'tiling', 'floor tiles',
    'wall tiles', 'ceramic', 'porcelain', 'grout', 'waterproof membrane',
  ],
  Waterproofing: [
    'waterproofing', 'membrane', 'as3740', 'wet areas', 'waterproof', 'tanking',
    'flashing', 'wet area', 'bathroom waterproof', 'balcony waterproof',
  ],
  Bricklaying: [
    'masonry', 'brickwork', 'brick veneer', 'blockwork', 'bricklayer', 'brick',
    'block', 'cavity', 'weep hole', 'dpc', 'damp proof',
  ],
  'Plastering / Gyprock': [
    'plasterboard', 'wall lining', 'ceiling lining', 'gyprock', 'plaster', 'cornice',
    'set', 'joint', 'tape', 'render', 'internal lining',
  ],
  'Painting & Decorating': [
    'paint finish', 'coating', 'internal finish', 'painting', 'paint', 'primer',
    'undercoat', 'top coat', '2 coat', 'ceiling paint', 'wall paint',
  ],
  Building: [
    'construction', 'build', 'residential', 'dwelling', 'extension', 'alteration',
    'new build', 'renovation', 'structural', 'load bearing',
  ],
  'Cabinet Making / Joinery': [
    'cabinetry', 'joinery', 'kitchen', 'cupboard', 'wardrobe', 'vanity',
    'bench', 'bench top', 'drawer', 'shelf',
  ],
  Flooring: [
    'flooring', 'timber floor', 'polished concrete', 'vinyl', 'laminate',
    'floor finish', 'floor covering', 'floating floor',
  ],
  'HVAC / Air Conditioning': [
    'hvac', 'air conditioning', 'split system', 'ducted', 'ac unit',
    'evaporative', 'mechanical', 'ventilation',
  ],
  Landscaping: [
    'landscape', 'retaining wall', 'garden', 'turf', 'irrigation',
    'deck', 'outdoor', 'landscaping',
  ],
  Fencing: [
    'fence', 'fencing', 'boundary fence', 'pool fence', 'balustrade',
  ],
  'Driveways / paving': [
    'driveway', 'paving', 'path', 'paved', 'crossover', 'hardstand',
  ],
  Glazing: [
    'glazing', 'window', 'glazed door', 'glass', 'double glazing', 'aluminium window',
  ],
  'Metalwork / structural steel': [
    'structural steel', 'steel frame', 'metalwork', 'steel beam', 'column', 'lintel steel',
  ],
  Insulation: [
    'insulation', 'batts', 'sarking', 'bulk insulation', 'ceiling insulation', 'wall insulation',
  ],
  Demolition: [
    'demolition', 'demolish', 'strip out', 'remove', 'strip',
  ],
  Labouring: [
    'labour', 'labouring', 'site clean', 'rubbish', 'skip',
  ],
};

/**
 * Infer likely trades from plan text using keyword matching.
 * Returns scored trades with evidence for AI context.
 */
export function inferTradesFromPlanText(text: string): InferredTrade[] {
  if (!text || typeof text !== 'string') return [];

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const bigrams = words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`);
  const trigrams = words.slice(0, -2).map((w, i) => `${w} ${words[i + 1]} ${words[i + 2]}`);
  const searchable = new Set([...words, ...bigrams, ...trigrams]);

  const scored: Map<string, { count: number; evidence: Set<string> }> = new Map();

  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    const evidence: string[] = [];
    let count = 0;

    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (searchable.has(kwLower)) {
        evidence.push(kw);
        count += 2;
      } else if (lower.includes(kwLower)) {
        evidence.push(kw);
        count += 1;
      }
    }

    if (count > 0) {
      const canonical = normalizeTradeName(trade);
      if (!canonical) continue; // Drop trades that don't map to a canonical category
      const existing = scored.get(canonical);
      if (!existing || existing.count < count) {
        scored.set(canonical, { count, evidence: new Set(evidence) });
      } else if (existing.count === count) {
        evidence.forEach((e) => existing.evidence.add(e));
      }
    }
  }

  const maxCount = Math.max(...Array.from(scored.values()).map((v) => v.count), 1);
  return Array.from(scored.entries())
    .map(([trade, { count, evidence }]) => ({
      trade,
      confidence: Math.min(0.99, 0.3 + (count / maxCount) * 0.6),
      evidence: Array.from(evidence).slice(0, 5),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
