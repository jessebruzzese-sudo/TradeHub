/**
 * Trade validation tests – AI-assisted drafts must only use canonical TradeHub trades.
 */
import { describe, it, expect } from 'vitest';
import {
  validateTradeName,
  filterValidTrades,
  filterValidTradesWithScope,
  isValidTrade,
} from './trade-validation';
import { TRADE_CATEGORIES } from './trades';

describe('validateTradeName', () => {
  it('keeps valid TradeHub trades (exact match)', () => {
    for (const trade of TRADE_CATEGORIES) {
      expect(validateTradeName(trade)).toBe(trade);
    }
  });

  it('normalizes case (case-insensitive)', () => {
    expect(validateTradeName('plumbing')).toBe('Plumbing');
    expect(validateTradeName('PLUMBING')).toBe('Plumbing');
    expect(validateTradeName('Plastering / Gyprock')).toBe('Plastering / Gyprock');
    expect(validateTradeName('plastering / gyprock')).toBe('Plastering / Gyprock');
  });

  it('trims whitespace', () => {
    expect(validateTradeName('  Plumbing  ')).toBe('Plumbing');
    expect(validateTradeName('\tTiling\n')).toBe('Tiling');
  });

  it('returns null for unknown trades', () => {
    expect(validateTradeName('Wall Linings')).toBeNull();
    expect(validateTradeName('Interior Finishes')).toBeNull();
    expect(validateTradeName('Bathroom Finishes')).toBeNull();
    expect(validateTradeName('Custom Trade')).toBeNull();
    expect(validateTradeName('')).toBeNull();
    expect(validateTradeName('   ')).toBeNull();
  });

  it('maps explicit aliases to canonical trades', () => {
    expect(validateTradeName('gyprock')).toBe('Plastering / Gyprock');
    expect(validateTradeName('plasterboard')).toBe('Plastering / Gyprock');
    expect(validateTradeName('floor tiling')).toBe('Tiling');
    expect(validateTradeName('fencing')).toBe('Landscaping');
    expect(validateTradeName('metalwork')).toBe('Building');
    expect(validateTradeName('masonry')).toBe('Bricklaying');
  });

  it('does not fuzzy-match (rejects near-matches)', () => {
    expect(validateTradeName('Plumber')).toBeNull();
    expect(validateTradeName('Tile')).toBeNull();
    expect(validateTradeName('Roof plumbing')).toBe('Roof plumbing / stormwater'); // alias
    expect(validateTradeName('Roof Plumbing')).toBe('Roof plumbing / stormwater'); // alias
  });
});

describe('filterValidTrades', () => {
  it('keeps only valid trades', () => {
    const input = ['Plumbing', 'Wall Linings', 'Tiling', 'Interior Finishes', 'Electrical'];
    const result = filterValidTrades(input);
    expect(result).toEqual(['Plumbing', 'Tiling', 'Electrical']);
  });

  it('deduplicates and normalizes', () => {
    const input = ['plumbing', 'Plumbing', '  Plumbing  '];
    const result = filterValidTrades(input);
    expect(result).toEqual(['Plumbing']);
  });

  it('returns empty array when all invalid', () => {
    const input = ['Wall Linings', 'Bathroom Finishes', 'Custom'];
    const result = filterValidTrades(input);
    expect(result).toEqual([]);
  });
});

describe('filterValidTradesWithScope', () => {
  it('keeps valid trades and preserves scope', () => {
    const input = [
      { trade: 'Plumbing', scope: 'Sanitary works', confidence: 0.9 },
      { trade: 'Wall Linings', scope: 'Internal linings', confidence: 0.8 },
      { trade: 'Tiling', scope: 'Wet areas', confidence: 0.7 },
    ];
    const result = filterValidTradesWithScope(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ trade: 'Plumbing', scope: 'Sanitary works' });
    expect(result[1]).toMatchObject({ trade: 'Tiling', scope: 'Wet areas' });
  });

  it('normalizes trade to canonical label', () => {
    const input = [{ trade: 'gyprock', scope: 'Internal linings', confidence: 0.8 }];
    const result = filterValidTradesWithScope(input);
    expect(result).toHaveLength(1);
    expect(result[0].trade).toBe('Plastering / Gyprock');
  });
});

describe('isValidTrade', () => {
  it('returns true for valid trades', () => {
    expect(isValidTrade('Plumbing')).toBe(true);
    expect(isValidTrade('plumbing')).toBe(true);
    expect(isValidTrade('Plastering / Gyprock')).toBe(true);
  });

  it('returns false for invalid trades', () => {
    expect(isValidTrade('Wall Linings')).toBe(false);
    expect(isValidTrade('')).toBe(false);
  });
});
