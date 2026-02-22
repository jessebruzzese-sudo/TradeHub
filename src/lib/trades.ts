// TradeHub trade categories – shared constant for discovery, signup, and profile

export const TRADE_CATEGORIES: string[] = [
  'Building',
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
];

export type TradeCategory = (typeof TRADE_CATEGORIES)[number];
