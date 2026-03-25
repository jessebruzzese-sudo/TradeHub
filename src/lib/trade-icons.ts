import {
  Wrench,
  Hammer,
  Zap,
  Paintbrush,
  HardHat,
  Truck,
  Flame,
  Droplet,
  LucideIcon,
  Building2,
  Layers,
  Grid3X3,
  Package,
  TreePine,
  Square,
  Box,
  Home,
  Droplets,
  AirVent,
  User,
} from 'lucide-react';

/** Canonical trade → Lucide icon. Keys are lowercase canonical labels from TRADES. */
const tradeIconMap: Record<string, LucideIcon> = {
  building: Building2,
  'builder/contractor': Building2,
  carpentry: Hammer,
  carpenter: Hammer,
  plumbing: Wrench,
  plumber: Wrench,
  stormwater: Wrench,
  electrical: Zap,
  electrician: Zap,
  concreting: Square,
  bricklaying: Box,
  roofing: Home,
  'plastering / gyprock': Layers,
  plastering: Layers,
  gyprock: Layers,
  'painting & decorating': Paintbrush,
  'painting and decorating': Paintbrush,
  painter: Paintbrush,
  painting: Paintbrush,
  tiling: Grid3X3,
  tiler: Grid3X3,
  flooring: Grid3X3,
  'cabinet making / joinery': Package,
  'cabinet making': Package,
  joinery: Package,
  waterproofing: Droplets,
  landscaping: TreePine,
  'hvac / air conditioning': AirVent,
  hvac: AirVent,
  'air conditioning': AirVent,
  refrigeration: Flame,
  demolition: Hammer,
  labouring: User,
  labour: User,
  laboring: User,
  labor: User,
  builder: HardHat,
  construction: HardHat,
  transport: Truck,
};

/** Default fallback when trade has no mapped icon. */
const DEFAULT_TRADE_ICON = Wrench;

export function getTradeIcon(trade?: string | null): LucideIcon {
  if (!trade || typeof trade !== 'string') return DEFAULT_TRADE_ICON;

  const key = trade.toLowerCase().trim();
  return tradeIconMap[key] || DEFAULT_TRADE_ICON;
}
