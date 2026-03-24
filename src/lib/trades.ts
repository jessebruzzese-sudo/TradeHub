// TradeHub trade categories – shared constant for discovery, signup, profile, and AI helpers

export const TRADE_CATEGORIES: string[] = [
  'Building',
  'Carpentry',
  'Plumbing',
  'Roof plumbing / stormwater',
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
];

export type TradeCategory = (typeof TRADE_CATEGORIES)[number];

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
  stormwater: 'Roof plumbing / stormwater',
  'roof plumbing': 'Roof plumbing / stormwater',
  hvac: 'HVAC / Air Conditioning',
  'air conditioning': 'HVAC / Air Conditioning',
  fencing: 'Landscaping',
  'driveways / paving': 'Landscaping',
  paving: 'Landscaping',
  glazing: 'Building',
  'metalwork / structural steel': 'Building',
  'structural steel': 'Building',
  metalwork: 'Building',
  insulation: 'Building',
  masonry: 'Bricklaying',
  'bricklaying / masonry': 'Bricklaying',
};
