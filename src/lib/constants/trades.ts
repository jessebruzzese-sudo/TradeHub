// TradeHub trade categories – shared constant for discovery, signup, profile, and AI helpers

/**
 * Canonical trade labels aligned with `public.trades.name` (active rows).
 * Kept for AI validation, slug parsing, and legacy normalization; selectors load from `/api/trades`.
 * DB: `users.primary_trade` + `users.additional_trades`; `jobs.trade_category` uses the same names.
 */
export const TRADES = [
  'Builder/Contractor',
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Concreting',
  'Bricklaying / Hebel',
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

export type TradeCategory = (typeof TRADES)[number];

/** Structured trade option for forms, filters, and AI validation. */
export type TradeOption = {
  id: string;
  label: string;
  slug?: string;
};

export const TRADE_OPTIONS: TradeOption[] = TRADES.map((label) => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}));

/**
 * Explicit aliases for AI output → canonical TradeHub trade.
 * Only use for known synonyms. No fuzzy matching.
 * Keys: lowercase alias. Values: exact canonical label from TRADES.
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
  bricklaying: 'Bricklaying / Hebel',
  hebel: 'Bricklaying / Hebel',
  'bricklaying / hebel': 'Bricklaying / Hebel',
  masonry: 'Bricklaying / Hebel',
  'bricklaying / masonry': 'Bricklaying / Hebel',
};

export function isValidTrade(value: string): value is TradeCategory {
  return (TRADES as readonly string[]).includes(value);
}

export function normalizeTrade(input: string): TradeCategory | null {
  const value = input.trim();

  if (isValidTrade(value)) return value;

  const alias = TRADE_ALIASES[value.toLowerCase()];
  if (alias && isValidTrade(alias)) return alias;

  return null;
}
