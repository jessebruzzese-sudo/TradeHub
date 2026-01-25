import { TRADE_CATEGORIES } from './trades';

export function parseTradeSuburbSlug(slug: string): { trade: string; suburb: string } | null {
  const parts = slug.split('-');

  if (parts.length < 2) return null;

  for (let i = 0; i < parts.length; i++) {
    const potentialTrade = parts.slice(0, i + 1).join(' ');

    const matchingTrade = TRADE_CATEGORIES.find(
      t => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ') ===
           potentialTrade.toLowerCase()
    );

    if (matchingTrade && i + 1 < parts.length) {
      const suburb = parts.slice(i + 1)
        .join(' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      return { trade: matchingTrade, suburb };
    }
  }

  return null;
}

export function createTradeSuburbSlug(trade: string, suburb: string): string {
  const tradeSlug = trade
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

  const suburbSlug = suburb
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

  return `${tradeSlug}-${suburbSlug}`;
}

export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function formatSuburbForDisplay(suburb: string): string {
  return suburb
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
