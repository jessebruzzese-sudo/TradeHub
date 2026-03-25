// TradeHub trade categories – shared constant for discovery, signup, profile, and AI helpers

/** Single source of truth for allowed trade labels (UI, API validation, discovery). */
export const TRADES = [
  'Builder/Contractor',
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Concreting',
  'Bricklaying',
  'Roofing',
  'Plastering / Gyprock',
  'Painting & Decorating',
  'Tiling',
  'Flooring',
  'Cabinet Making / Joinery',
  'Waterproofing',
  'Landscaping',
  'HVAC / Air Conditioning',
  'Demolition',
  'Labouring',
] as const;

export const TRADE_CATEGORIES: string[] = [...TRADES];

export type TradeCategory = (typeof TRADES)[number];

/** Structured trade option for forms, filters, and AI validation. */
export type TradeOption = {
  id: string;
  label: string;
  slug?: string;
};

/** Canonical trade options derived from TRADE_CATEGORIES. Single source of truth for valid trades. */
export const TRADE_OPTIONS: TradeOption[] = TRADE_CATEGORIES.map((label) => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}));

/**
 * Explicit aliases for AI output → canonical TradeHub trade.
 * Only use for known synonyms. No fuzzy matching.
 * Keys: lowercase alias. Values: exact canonical label from TRADE_CATEGORIES.
 */
export const TRADE_ALIASES: Record<string, string> = {
  gyprock: 'Plastering / Gyprock',
  plasterboard: 'Plastering / Gyprock',
  plaster: 'Plastering / Gyprock',
  'floor tiling': 'Tiling',
  'wall tiling': 'Tiling',
  painting: 'Painting & Decorating',
  'painting and decorating': 'Painting & Decorating',
  joinery: 'Cabinet Making / Joinery',
  'cabinet making': 'Cabinet Making / Joinery',
  stormwater: 'Plumbing',
  'roof plumbing': 'Plumbing',
  'roof plumbing / stormwater': 'Plumbing',
  hvac: 'HVAC / Air Conditioning',
  'air conditioning': 'HVAC / Air Conditioning',
  fencing: 'Landscaping',
  'driveways / paving': 'Landscaping',
  paving: 'Landscaping',
  glazing: 'Builder/Contractor',
  'metalwork / structural steel': 'Builder/Contractor',
  'structural steel': 'Builder/Contractor',
  metalwork: 'Builder/Contractor',
  insulation: 'Builder/Contractor',
  building: 'Builder/Contractor',
  masonry: 'Bricklaying',
  'bricklaying / masonry': 'Bricklaying',
};
