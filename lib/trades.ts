// Primary Trade List (v1) - Required, Locked After Signup
// Organized by category but presented as a flat list in UI

export const TRADE_CATEGORIES = [
  // Core Construction Trades
  'Electrician',
  'Plumber',
  'Carpenter',
  'Builder',
  'Bricklayer / Blocklayer',
  'Concreter',
  'Roofer',
  'Plasterer',
  'Painter & Decorator',
  'Tiler',
  'Flooring Installer',
  'Cabinet Maker / Joiner',
  'Glazier',
  'Steel Fixer',
  'Welder / Fabricator',
  'Landscaper',
  'Fencer',
  'Renderer',
  'Waterproofer',
  'Insulation Installer',

  // Mechanical / Services Trades
  'HVAC / Air Conditioning',
  'Refrigeration Mechanic',
  'Gas Fitter',
  'Fire Services Technician',
  'Lift / Elevator Technician',
  'Security Systems Installer',
  'Data / Communications Technician',

  // Civil / External Works
  'Earthworks Operator',
  'Excavator / Plant Operator',
  'Asphalt / Bitumen Worker',
  'Roadworks / Civil Labour',
  'Traffic Control',

  // Specialist / Finishing
  'Shopfitter',
  'Sign Installer',
  'Window Furnishings Installer',
  'Stone Mason',
  'Pool Builder',
  'Water Features / Ponds',
  'Facade Installer',

  // Labour & Support
  'Skilled Labourer',
  'General Labourer',
  'Trade Assistant',
] as const;

export type TradeCategory = typeof TRADE_CATEGORIES[number];
