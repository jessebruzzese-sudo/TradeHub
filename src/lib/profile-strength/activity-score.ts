export type ActivityTier = 'fresh' | 'recent' | 'cooling' | 'stale' | 'inactive';

function toValidDate(input: Date | string | null): Date | null {
  if (!input) return null;
  const value = input instanceof Date ? input : new Date(input);
  return Number.isFinite(value.getTime()) ? value : null;
}

export function getInactiveDays(lastActiveAt: Date | string | null): number {
  const date = toValidDate(lastActiveAt);
  if (!date) return 30;
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return 30;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getActivityPoints(lastActiveAt: Date | string | null): number {
  const inactiveDays = getInactiveDays(lastActiveAt);
  if (inactiveDays >= 30) return 0;
  if (inactiveDays >= 22) return 8;
  if (inactiveDays >= 15) return 16;
  if (inactiveDays >= 8) return 24;
  return 32;
}

export function getActivityTier(lastActiveAt: Date | string | null): ActivityTier {
  const inactiveDays = getInactiveDays(lastActiveAt);
  if (inactiveDays >= 30) return 'inactive';
  if (inactiveDays >= 22) return 'stale';
  if (inactiveDays >= 15) return 'cooling';
  if (inactiveDays >= 8) return 'recent';
  return 'fresh';
}

export function getActivityWarning(lastActiveAt: Date | string | null): string | null {
  const inactiveDays = getInactiveDays(lastActiveAt);
  if (inactiveDays >= 30) {
    return 'Your profile has been inactive. Open TradeHub to restore your activity score.';
  }
  if (inactiveDays >= 22) {
    return 'Your activity score is starting to drop. Open TradeHub regularly to keep it strong.';
  }
  return null;
}

