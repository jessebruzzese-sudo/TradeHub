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
} from 'lucide-react';

const tradeIconMap: Record<string, LucideIcon> = {
  plumbing: Wrench,
  plumber: Wrench,

  electrician: Zap,
  electrical: Zap,

  carpenter: Hammer,
  carpentry: Hammer,

  painter: Paintbrush,
  painting: Paintbrush,

  builder: HardHat,
  construction: HardHat,

  tiler: Droplet,
  roofing: HardHat,

  hvac: Flame,
  refrigeration: Flame,

  transport: Truck,
};

export function getTradeIcon(trade?: string): LucideIcon {
  if (!trade) return Wrench;

  const key = trade.toLowerCase().trim();
  return tradeIconMap[key] || Wrench;
}
