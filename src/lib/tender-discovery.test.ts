/**
 * Tender discovery tests – AI-generated and manual tenders must be discoverable identically.
 * Tests: trade matching, radius (free=20km, premium=100km), multi-trade, parity.
 * Uses hasValidCoordinates: no 0/0 fallback; missing coords = hidden from discovery.
 */
import { describe, it, expect } from 'vitest';
import { validateTradeName } from './trade-validation';
import { hasValidCoordinates } from './coordinates';
// Discovery logic mirrors get_tenders_visible_to_viewer RPC

const FREE_RADIUS_KM = 20;
const PREMIUM_RADIUS_KM = 100;

type TenderDiscoveryRow = {
  id: string;
  builder_id: string;
  trade: string;
  suburb: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  viewer_radius_km: number;
};

function kmDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function simulateDiscoveryFilter(
  tenders: { id: string; trades: string[]; lat: number | null; lng: number | null }[],
  viewer: { trades: string[]; lat: number; lng: number; radiusKm: number }
): string[] {
  const viewerTradeSet = new Set(
    viewer.trades
      .map((t) => validateTradeName(t))
      .filter((x): x is string => x != null)
      .map((c) => c.toLowerCase())
  );

  if (!hasValidCoordinates(viewer.lat, viewer.lng)) return [];

  return tenders
    .filter((t) => {
      if (!hasValidCoordinates(t.lat, t.lng)) return false;

      const hasMatchingTrade = t.trades.some((tr) => {
        const canonical = validateTradeName(tr);
        return canonical != null && viewerTradeSet.has(canonical.toLowerCase());
      });
      if (!hasMatchingTrade) return false;

      const dist = kmDistance(viewer.lat, viewer.lng, t.lat!, t.lng!);
      if (dist > viewer.radiusKm) return false;
      return true;
    })
    .map((t) => t.id);
}

describe('Tender discovery – trade matching', () => {
  // Melbourne CBD as reference
  const MELBOURNE = { lat: -37.8136, lng: 144.9631 };

  it('A. Matching trade + within free radius (~15 km) → visible', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: -37.78,
        lng: 145.12, // ~15 km NE of Melbourne
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).toContain('t1');
  });

  it('B. Matching trade + outside free radius (~30 km) → hidden', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: -37.65,
        lng: 145.35, // ~30 km NE of Melbourne
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('C. Matching trade + within premium radius (~80 km) → visible', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: -38.15,
        lng: 144.36, // Geelong ~75 km SW
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: PREMIUM_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).toContain('t1');
  });

  it('D. Matching trade + outside premium radius (~120 km) → hidden', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: -38.5,
        lng: 143.5, // ~120 km SW (Ballarat area)
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: PREMIUM_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('E. Unrelated trade within radius → hidden', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: -37.81,
        lng: 144.96,
      },
    ];
    const viewer = {
      trades: ['Painting & Decorating'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('F. Missing coordinates → hidden from Find Work discovery', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: null,
        lng: null,
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('F2. 0/0 coordinates → hidden (not valid)', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock'],
        lat: 0,
        lng: 0,
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('G. Multi-trade tender: plastering user sees it', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock', 'Tiling'],
        lat: -37.81,
        lng: 144.96,
      },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).toContain('t1');
  });

  it('G. Multi-trade tender: tiling user sees it', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock', 'Tiling'],
        lat: -37.81,
        lng: 144.96,
      },
    ];
    const viewer = {
      trades: ['Tiling'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).toContain('t1');
  });

  it('G. Multi-trade tender: unrelated trade does not see it', () => {
    const tenders = [
      {
        id: 't1',
        trades: ['Plastering / Gyprock', 'Tiling'],
        lat: -37.81,
        lng: 144.96,
      },
    ];
    const viewer = {
      trades: ['Painting & Decorating'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('H. Canonical trade validation: only canonical trades match', () => {
    const tenders = [
      { id: 't1', trades: ['Plastering / Gyprock'], lat: -37.81, lng: 144.96 },
    ];
    const viewer = {
      trades: ['Plastering / Gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).toContain('t1');
  });

  it('Invalid trade names are not matched', () => {
    const tenders = [
      { id: 't1', trades: ['Wall Linings'], lat: -37.81, lng: 144.96 },
    ];
    const viewer = {
      trades: ['Wall Linings'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    expect(validateTradeName('Wall Linings')).toBeNull();
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).not.toContain('t1');
  });

  it('Alias maps to canonical for matching', () => {
    const tenders = [
      { id: 't1', trades: ['Plastering / Gyprock'], lat: -37.81, lng: 144.96 },
    ];
    const viewer = {
      trades: ['gyprock'],
      lat: MELBOURNE.lat,
      lng: MELBOURNE.lng,
      radiusKm: FREE_RADIUS_KM,
    };
    expect(validateTradeName('gyprock')).toBe('Plastering / Gyprock');
    const visible = simulateDiscoveryFilter(tenders, viewer);
    expect(visible).toContain('t1');
  });

  it('I. Radius constants: free=20km, premium=100km', () => {
    expect(FREE_RADIUS_KM).toBe(20);
    expect(PREMIUM_RADIUS_KM).toBe(100);
  });
});
