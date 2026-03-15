import { describe, expect, it } from 'vitest';
import { checkTenderCreationLimit } from './tender-limit-utils';
import { getLimits, getTier, isPremiumPlanValue } from './plan-limits';
import {
  bboxForRadiusKm,
  clampLng,
  getDiscoveryRadiusKm,
  getViewerCenter,
  haversineKm,
  isPremiumForDiscovery,
  roundCount,
} from './discovery';
import {
  filterValidTrades,
  filterValidTradesWithScope,
  isValidTrade,
  validateTradeName,
  validateTradeWithScope,
} from './trade-validation';

describe('enforcement sweep: plan and premium logic', () => {
  it('detects premium-like plan names safely', () => {
    expect(isPremiumPlanValue('premium')).toBe(true);
    expect(isPremiumPlanValue('SUBCONTRACTOR_PRO_10')).toBe(true);
    expect(isPremiumPlanValue('ALL_ACCESS_PRO_26')).toBe(true);
    expect(isPremiumPlanValue('free')).toBe(false);
    expect(isPremiumPlanValue('improve')).toBe(false);
  });

  it('returns tier and limits from user profile signals', () => {
    expect(getTier({ plan: 'free' })).toBe('free');
    expect(getTier({ plan: 'premium' })).toBe('premium');
    expect(getTier({ subscription_status: 'active', active_plan: 'SUBCONTRACTOR_PRO_10' })).toBe('premium');
    expect(getLimits('free').discoveryRadiusKm).toBe(20);
    expect(getLimits('premium').discoveryRadiusKm).toBe(100);
    expect(getLimits('free')).not.toBe(getLimits('free'));
  });
});

describe('enforcement sweep: discovery and radius limits', () => {
  it('clamps radius by plan and safety caps', () => {
    expect(getDiscoveryRadiusKm({ plan: 'free' }, 999)).toBe(20);
    expect(getDiscoveryRadiusKm({ plan: 'premium' }, 999)).toBe(100);
    expect(getDiscoveryRadiusKm({ plan: 'free' }, -5)).toBe(1);
    expect(getDiscoveryRadiusKm({ plan: 'premium' }, null)).toBe(100);
  });

  it('uses premium search center and free fallbacks correctly', () => {
    const premiumCenter = getViewerCenter({
      id: 'premium-user',
      plan: 'premium',
      search_lat: -33.9,
      search_lng: 151.2,
      location_lat: -37.8,
      location_lng: 144.9,
    });
    expect(premiumCenter).toEqual({ lat: -33.9, lng: 151.2 });

    const freeCenter = getViewerCenter({
      id: 'free-user',
      plan: 'free',
      search_lat: -33.9,
      search_lng: 151.2,
      location_lat: -37.8,
      location_lng: 144.9,
    });
    expect(freeCenter).toEqual({ lat: -37.8, lng: 144.9 });

    expect(isPremiumForDiscovery({ plan: 'premium' })).toBe(true);
    expect(isPremiumForDiscovery({ plan: 'free' })).toBe(false);
  });

  it('computes geo helpers and display rounding', () => {
    expect(clampLng(181)).toBe(-179);
    const bbox = bboxForRadiusKm(-33.86, 151.2, 20);
    expect(bbox.minLat).toBeLessThan(bbox.maxLat);
    expect(typeof bbox.minLng).toBe('number');
    expect(haversineKm(-33.86, 151.2, -33.87, 151.21)).toBeGreaterThan(0);
    expect(roundCount(17)).toBe('17+');
    expect(roundCount(1250)).toBe('1.3k+');
  });
});

describe('enforcement sweep: trade validation strictness', () => {
  it('accepts canonical trades and known aliases only', () => {
    expect(validateTradeName('Plumbing')).toBe('Plumbing');
    expect(validateTradeName(' plumbing ')).toBe('Plumbing');
    expect(validateTradeName('gyprock')).toBe('Plastering / Gyprock');
    expect(validateTradeName('unknown trade')).toBeNull();
    expect(isValidTrade('Electrical')).toBe(true);
    expect(isValidTrade('Electrical-ish')).toBe(false);
  });

  it('filters invalid trades and normalizes valid ones', () => {
    expect(filterValidTrades(['Plumbing', 'gyprock', 'nope'])).toEqual([
      'Plumbing',
      'Plastering / Gyprock',
    ]);

    expect(
      filterValidTradesWithScope([
        { trade: 'gyprock', scope: 'Ceilings' },
        { trade: 'invalid', scope: 'x' },
      ])
    ).toEqual([{ trade: 'Plastering / Gyprock', scope: 'Ceilings' }]);

    const scoped = validateTradeWithScope({ trade: '  electrical ', scope: 'Rewire kitchen', extra: 1 });
    expect(scoped?.trade).toBe('Electrical');
    expect(scoped?.scope).toBe('Rewire kitchen');
  });
});

describe('enforcement sweep: tender creation limits', () => {
  const mockSupabase = (count: number | null, error: unknown = null) => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            gte: async () => ({ count, error }),
          }),
        }),
      }),
    }),
  });

  it('allows unlimited for premium users', async () => {
    const result = await checkTenderCreationLimit(
      mockSupabase(999) as any,
      'user-1',
      { id: 'user-1', plan: 'premium' }
    );
    expect(result.allowed).toBe(true);
  });

  it('blocks free users after monthly threshold', async () => {
    const result = await checkTenderCreationLimit(
      mockSupabase(1) as any,
      'user-2',
      { id: 'user-2', plan: 'free' }
    );
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/1 active tender per month/i);
  });

  it('fails open on query errors', async () => {
    const result = await checkTenderCreationLimit(
      mockSupabase(null, new Error('db error')) as any,
      'user-3',
      { id: 'user-3', plan: 'free' }
    );
    expect(result.allowed).toBe(true);
  });
});
