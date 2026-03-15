/**
 * Wet area, room, and building element detection from construction plan text.
 * Counts bathrooms, ensuites, laundries, kitchens, WC, powder rooms.
 * Detects storeys, garage, alfresco, roof plan.
 */

export type RoomCounts = {
  bathrooms: number;
  ensuites: number;
  laundries: number;
  kitchens: number;
  wc: number;
  powder_rooms: number;
};

export type BuildingElements = {
  floors: number;
  hasGroundFloor: boolean;
  hasFirstFloor: boolean;
  hasSecondFloor: boolean;
  hasGroundFloorPlan: boolean;
  hasFirstFloorPlan: boolean;
  hasGarage: boolean;
  hasAlfresco: boolean;
  hasRoofPlan: boolean;
};

/** Terms that map to each room type (case-insensitive, word boundary). */
const ROOM_TERMS: Record<keyof RoomCounts, RegExp[]> = {
  bathrooms: [/\bbathroom\b/gi, /\bbath\s+room\b/gi],
  ensuites: [/\bensuite\b/gi, /\ben\s*suite\b/gi],
  laundries: [/\blaundry\b/gi, /\blaundries\b/gi],
  kitchens: [/\bkitchen\b/gi, /\bkitchens\b/gi],
  wc: [/\bwc\b/g, /\bw\.c\.\b/gi, /\bwater\s*closet\b/gi],
  powder_rooms: [/\bpowder\s*room\b/gi, /\bpowder\b/gi],
};

function countMatches(text: string, patterns: RegExp[]): number {
  if (!text || text.length < 10) return 0;
  let total = 0;
  for (const re of patterns) {
    const matches = text.match(re);
    total += matches?.length ?? 0;
  }
  return total;
}

/**
 * Detect wet areas and room counts from combined plan text.
 * Returns counts for bathrooms, ensuites, laundries, kitchens, WC, powder rooms.
 */
export function detectRoomsFromPlanText(text: string): RoomCounts {
  if (!text || typeof text !== 'string') {
    return { bathrooms: 0, ensuites: 0, laundries: 0, kitchens: 0, wc: 0, powder_rooms: 0 };
  }

  const bathrooms = Math.min(6, Math.max(0, countMatches(text, ROOM_TERMS.bathrooms)));
  const ensuites = Math.min(4, Math.max(0, countMatches(text, ROOM_TERMS.ensuites)));
  const laundries = Math.min(1, Math.max(0, countMatches(text, ROOM_TERMS.laundries)));
  const kitchens = Math.min(1, Math.max(0, countMatches(text, ROOM_TERMS.kitchens)));
  const wc = countMatches(text, ROOM_TERMS.wc);
  const powder_rooms = countMatches(text, ROOM_TERMS.powder_rooms);

  return {
    bathrooms,
    ensuites,
    laundries,
    kitchens,
    wc,
    powder_rooms,
  };
}

/**
 * Detect building elements: floors, garage, alfresco, roof plan.
 */
export function detectBuildingElements(text: string): BuildingElements {
  if (!text || typeof text !== 'string') {
    return {
      floors: 1,
      hasGroundFloor: false,
      hasFirstFloor: false,
      hasSecondFloor: false,
      hasGroundFloorPlan: false,
      hasFirstFloorPlan: false,
      hasGarage: false,
      hasAlfresco: false,
      hasRoofPlan: false,
    };
  }

  // Require "ground floor plan" or "ground floor layout" to avoid false positives from "ground floor" in general text.
  // "First floor" alone (e.g. "First Floor Plan") often labels the only floor in single-storey plans.
  const hasGroundFloor =
    /\bground\s+floor\s+plan\b/i.test(text) ||
    /\bground\s+floor\s+layout\b/i.test(text) ||
    /\bground\s+floor\b/i.test(text);
  const hasFirstFloor = /\bfirst\s+floor\b/i.test(text) || /\b1st\s+floor\b/i.test(text);
  const hasSecondFloor = /\bsecond\s+floor\b/i.test(text) || /\b2nd\s+floor\b/i.test(text);

  // Stricter double-storey: require BOTH ground and first floor as distinct floor-plan labels.
  // Single-storey plans often label the only floor as "First Floor Plan" - do not treat as double.
  const hasGroundFloorPlan =
    /\bground\s+floor\s+(plan|layout)\b/i.test(text) ||
    /\bproposed\s+ground\s+floor\s+(plan|layout)?\b/i.test(text) ||
    /\bground\s+floor\s+plan\b/i.test(text);
  const hasFirstFloorPlan =
    /\b(first|1st)\s+floor\s+(plan|layout)\b/i.test(text) ||
    /\bproposed\s+(first|1st)\s+floor\s+(plan|layout)?\b/i.test(text) ||
    /\bfirst\s+floor\s+plan\b/i.test(text);
  const hasRoofPlan = /\broof\s+plan\b/i.test(text) || /\broof\s+layout\b/i.test(text);
  const hasGarage = /\bgarage\b/i.test(text);
  const hasAlfresco = /\balfresco\b/i.test(text) || /\bal\s+fresco\b/i.test(text);

  let floors: 1 | 2 | 3 = 1;
  if (hasSecondFloor) {
    floors = 3;
  } else if (hasGroundFloorPlan && hasFirstFloorPlan) {
    floors = 2;
  } else {
    floors = 1;
  }

  return {
    floors: Math.min(3, Math.max(1, floors)) as 1 | 2 | 3,
    hasGroundFloor,
    hasFirstFloor,
    hasSecondFloor,
    hasGroundFloorPlan,
    hasFirstFloorPlan,
    hasGarage,
    hasAlfresco,
    hasRoofPlan,
  };
}
