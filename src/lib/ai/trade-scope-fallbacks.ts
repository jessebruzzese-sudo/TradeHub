import { validateTradeName } from '@/lib/trade-validation';
import type { RoomCounts } from '@/lib/ai/plan-room-detection';
import type { BuildingElements } from '@/lib/ai/plan-room-detection';

/**
 * Trade-specific fallback scope templates for when AI output is weak or empty.
 * Used when AI returns generic, empty, or filler-heavy scope text.
 */
/**
 * Fallback scopes written like a builder briefing subcontractors.
 * Reference rooms/building elements when known; be concise but specific.
 */
export const TRADE_SCOPE_FALLBACKS: Record<string, string> = {
  Plumbing:
    'Supply and install sanitary plumbing, drainage, floor wastes and hot water service to bathrooms, ensuite, kitchen and laundry; gutters, downpipes and stormwater to legal point of discharge as per plans.',
  Electrical:
    'Electrical rough-in and fit-off including lighting, power, smoke alarms and data points throughout the dwelling as per electrical layout.',
  Carpentry:
    'Timber wall and roof framing including internal structural framing and roof framing as per structural drawings.',
  Roofing:
    'Roof covering installation including flashing, gutters and downpipes as per roof plan.',
  Concreting:
    'Concrete slab, footings and associated external concrete works as per plans.',
  Waterproofing:
    'Waterproof membrane installation to bathrooms and ensuite wet areas prior to tiling.',
  Tiling:
    'Wet area floor and wall tiling including shower areas and splashbacks as per plans.',
  'Bricklaying / Hebel':
    'External brickwork / masonry veneer and associated masonry works to the dwelling as shown on plans.',
  'Plastering / Gyprock':
    'Internal plasterboard wall and ceiling linings, set and finish throughout the dwelling.',
  'Painting & Decorating':
    'Preparation and painting of internal and external finished building surfaces following completion of linings and trim works.',
  Flooring:
    'Supply and install nominated floor finishes to living areas, bedrooms and other scheduled areas.',
  'Cabinet Making / Joinery':
    'Supply and install kitchen, vanity and other built-in joinery items shown on plans.',
  'HVAC / Air Conditioning':
    'HVAC installation, ducting and associated mechanical services as per plans.',
  Landscaping:
    'Paving, retaining walls and associated landscaping works as per plans.',
  Demolition:
    'Strip-out and demolition works as per scope.',
  Labouring:
    'Labour and site support services as required.',
  'Builder/Contractor':
    'Building coordination and works as per plans.',
  Fencing:
    'Supply and install boundary and pool fencing as per plans.',
  'Driveways / paving':
    'Construct driveway, paths or paved external surfaces shown on the site or landscape plans.',
  Glazing:
    'Supply and install windows, glazed doors and associated glazing elements as shown on plans.',
  'Metalwork / structural steel':
    'Supply and install structural steel and metalwork as per structural drawings.',
  Insulation:
    'Install wall, ceiling and roof insulation as per plans.',
};

/**
 * Normalize trade name to a TradeHub canonical category.
 * Uses strict validation only: exact match, trimmed, case-insensitive, or explicit alias.
 * No fuzzy matching. Unknown trades return empty (dropped).
 */
export function normalizeTradeName(trade: string): string {
  const canonical = validateTradeName(trade);
  return canonical ?? '';
}

export type FallbackScopeContext = {
  roomCounts?: RoomCounts | null;
  building?: BuildingElements | null;
  dwellingCount?: number;
};

export function getFallbackScope(trade: string, context?: RoomCounts | FallbackScopeContext | null): string | null {
  const roomCounts =
    context && typeof context === 'object' && 'bathrooms' in context && !('roomCounts' in context)
      ? (context as RoomCounts)
      : (context as FallbackScopeContext)?.roomCounts ?? null;
  const building = (context as FallbackScopeContext)?.building ?? null;
  const dwellingCount = (context as FallbackScopeContext)?.dwellingCount ?? 1;

  const normalized = normalizeTradeName(trade);
  let base = TRADE_SCOPE_FALLBACKS[normalized] ?? null;

  if (dwellingCount >= 2) {
    const multiBase = getMultiDwellingFallback(normalized, roomCounts, building, dwellingCount);
    if (multiBase) return multiBase;
  }

  if (normalized === 'Plumbing' && base && roomCounts) {
    return getPlumbingScopeWithRooms(roomCounts);
  }
  if (normalized === 'Electrical' && base && building && building.floors >= 2) {
    return getElectricalScopeWithStorey(building);
  }
  if (normalized === 'Carpentry' && base && building && building.floors >= 2) {
    return getCarpentryScopeWithStorey(building);
  }
  return base;
}

/** Multi-dwelling fallback scopes when 2+ dwellings detected. */
function getMultiDwellingFallback(
  trade: string,
  roomCounts: RoomCounts | null,
  building: BuildingElements | null,
  dwellingCount: number = 2
): string | null {
  const dwellingsPhrase = dwellingCount === 2 ? 'across both dwellings' : `across all ${dwellingCount} dwellings`;
  switch (trade) {
    case 'Plumbing':
      return roomCounts
        ? `Plumbing rough-in to wet areas, kitchens and laundries ${dwellingsPhrase} including sanitary drainage, floor wastes and hot water service.`
        : `Plumbing rough-in to wet areas, kitchens and laundries ${dwellingsPhrase} as per plans.`;
    case 'Electrical':
      return `Electrical rough-in and fit-off ${dwellingsPhrase} including lighting, power, smoke alarms and data points throughout as per electrical layout.`;
    case 'Carpentry':
      return `Timber framing and associated carpentry works ${dwellingsPhrase} including wall framing, roof framing and structural members.`;
    case 'Waterproofing':
      return `Waterproof membrane installation to wet areas ${dwellingsPhrase} prior to tiling.`;
    case 'Tiling':
      return `Wet area floor and wall tiling ${dwellingsPhrase} including shower areas and splashbacks as per plans.`;
    case 'Painting & Decorating':
      return `Preparation and painting of internal and external surfaces ${dwellingsPhrase} following completion of linings and trim works.`;
    case 'Cabinet Making / Joinery':
      return `Supply and install kitchen, vanity and other built-in joinery ${dwellingsPhrase} as shown on plans.`;
    default:
      return null;
  }
}

function getElectricalScopeWithStorey(b: BuildingElements): string {
  const parts = ['Electrical rough-in including lighting, power, smoke alarms and data'];
  if (b.floors >= 2) parts.push('to a double storey dwelling');
  if (b.hasGarage) parts.push('including garage');
  return parts.join(' ') + '.';
}

function getCarpentryScopeWithStorey(b: BuildingElements): string {
  const parts = ['Timber framing'];
  if (b.floors >= 2) parts.push('for a double storey dwelling');
  parts.push('including wall framing, roof framing and structural members.');
  return parts.join(' ');
}

/**
 * Build plumbing scope from detected room counts.
 * Example: "Plumbing rough-in to 2 bathrooms, 1 ensuite, kitchen and laundry including sanitary drainage, floor wastes and hot water service."
 */
export function getPlumbingScopeWithRooms(rooms: RoomCounts): string {
  const parts: string[] = [];
  if (rooms.bathrooms > 0) {
    parts.push(`${rooms.bathrooms} bathroom${rooms.bathrooms > 1 ? 's' : ''}`);
  }
  if (rooms.ensuites > 0) {
    parts.push(`${rooms.ensuites} ensuite${rooms.ensuites > 1 ? 's' : ''}`);
  }
  if (rooms.kitchens > 0) parts.push('kitchen');
  if (rooms.laundries > 0) parts.push('laundry');

  if (parts.length === 0) {
    return 'Supply and install sanitary plumbing, drainage, floor wastes and hot water service to bathrooms, ensuite, kitchen and laundry as per plans.';
  }

  const roomList = parts.join(', ');
  return `Supply and install sanitary plumbing, drainage, floor wastes and hot water service to ${roomList} as per plans.`;
}
