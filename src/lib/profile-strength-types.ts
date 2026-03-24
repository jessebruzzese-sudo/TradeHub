export type ProfileStrengthCalc = {
  total: number;
  band: string;
  activity: number;
  links: number;
  google: number;
  likes: number;
  completeness: number;
  abn?: number;
  last_active_at?: string | null;
  inactive_days?: number;
  activity_tier?: 'fresh' | 'recent' | 'cooling' | 'stale' | 'inactive';
  breakdown?: Record<string, unknown>;
  activity_detail?: Record<string, unknown>;
};
