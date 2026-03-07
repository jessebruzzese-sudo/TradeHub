/**
 * TradeHub Playwright seed IDs.
 * Loaded from playwright/seed-ids.json (written by npm run qa:seed).
 * Use for deterministic navigation when seed data exists.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface SeedIds {
  users: Record<string, string>;
  jobs: { ownedOpen?: string; nonOwnedOpen?: string; withAttachment?: string };
  tenders: { ownedDraft?: string; ownedLive?: string; nonOwned?: string };
}

let _cached: SeedIds | null | undefined = undefined;

/** Load seed IDs from playwright/seed-ids.json. Returns null if file missing or invalid. */
export function loadSeedIds(): SeedIds | null {
  if (_cached !== undefined) return _cached;
  const path = join(process.cwd(), 'playwright', 'seed-ids.json');
  if (!existsSync(path)) {
    _cached = null;
    return null;
  }
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as SeedIds;
    _cached = data;
    return data;
  } catch {
    _cached = null;
    return null;
  }
}

/** Seed record titles for deterministic selectors (no ID file needed). */
export const SEED_TITLES = {
  job: {
    ownedOpen: '[QA] Owned Open Job',
    nonOwnedOpen: '[QA] Non-Owned Open Job',
    withAttachment: '[QA] Job With Attachment',
  },
  tender: {
    ownedDraft: '[QA] Owned Draft Tender',
    ownedLive: '[QA] Owned Live Tender',
    nonOwned: '[QA] Non-Owned Tender',
  },
} as const;
