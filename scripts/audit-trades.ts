/**
 * TradeHub — audit stored trade values against canonical TRADES + TRADE_ALIASES.
 *
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * Load .env.local then .env via dotenv.
 *
 * Usage:
 *   npm run trade:audit        — read-only report + tmp/trade-audit-review.json if needed
 *   npm run trade:audit:fix    — apply alias normalizations only (never unknowns)
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import {
  TRADES,
  TRADE_ALIASES,
  normalizeTrade,
  isValidTrade,
} from '@/lib/constants/trades';

const ROOT = process.cwd();

dotenv.config({ path: join(ROOT, '.env.local') });
dotenv.config({ path: join(ROOT, '.env') });

const FIX = process.argv.includes('--fix');
const PAGE = 1000;

type Classify =
  | { kind: 'empty' }
  | { kind: 'valid'; canonical: string }
  | { kind: 'alias_fixable'; raw: string; canonical: string }
  | { kind: 'invalid_unknown'; raw: string };

function classifyValue(raw: string | null | undefined): Classify {
  const stored = String(raw ?? '');
  const t = stored.trim();
  if (!t) return { kind: 'empty' };
  if (isValidTrade(t)) return { kind: 'valid', canonical: t };
  const n = normalizeTrade(t);
  if (n !== null) return { kind: 'alias_fixable', raw: t, canonical: n };
  return { kind: 'invalid_unknown', raw: t };
}

/** Normalize array items; fails if any non-empty item is not valid or alias-fixable. Dedupes, preserves order. */
function tryCanonicalizeArray(items: string[]): { ok: true; values: string[] } | { ok: false; invalid: string[] } {
  const invalid: string[] = [];
  for (const item of items) {
    const s = String(item ?? '').trim();
    if (!s) continue;
    if (normalizeTrade(s) === null && !invalid.includes(s)) invalid.push(s);
  }
  if (invalid.length > 0) return { ok: false, invalid };

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const s = String(item ?? '').trim();
    if (!s) continue;
    const n = normalizeTrade(s)!;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return { ok: true, values: out };
}

function shouldFixScalar(raw: string | null | undefined): { fix: false } | { fix: true; next: string } {
  if (raw == null) return { fix: false };
  const stored = String(raw);
  const t = stored.trim();
  if (!t) return { fix: false };
  const n = normalizeTrade(t);
  if (n === null) return { fix: false };
  if (stored !== n) return { fix: true, next: n };
  return { fix: false };
}

function arraysEqualAsTextArray(a: string[] | null, b: string[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

type BucketMaps = {
  valid: Map<string, number>;
  alias: Map<string, number>;
  invalid: Map<string, number>;
};

function emptyBuckets(): BucketMaps {
  return {
    valid: new Map(),
    alias: new Map(),
    invalid: new Map(),
  };
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function recordClassification(b: BucketMaps, c: Classify) {
  switch (c.kind) {
    case 'empty':
      break;
    case 'valid':
      bump(b.valid, c.canonical);
      break;
    case 'alias_fixable':
      bump(b.alias, `${c.raw} -> ${c.canonical}`);
      break;
    case 'invalid_unknown':
      bump(b.invalid, c.raw);
      break;
  }
}

type ManualReviewItem = {
  sourceTable: string;
  rowId: string;
  field: string;
  rawValue: string;
  suggestedNormalizedValue: string | null;
  status: 'manual_review_required';
};

const reviewItems: ManualReviewItem[] = [];

function addReview(
  sourceTable: string,
  rowId: string,
  field: string,
  rawValue: string,
  suggested: string | null = null
) {
  reviewItems.push({
    sourceTable,
    rowId,
    field,
    rawValue,
    suggestedNormalizedValue: suggested,
    status: 'manual_review_required',
  });
}

function printBucket(map: Map<string, number>, indent = '  ') {
  if (map.size === 0) {
    console.log(`${indent}(none)`);
    return;
  }
  const entries = [...map.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  for (const [k, n] of entries) {
    console.log(`${indent}- ${k} (${n})`);
  }
}

function printSourceReport(name: string, b: BucketMaps) {
  console.log(`\nSOURCE: ${name}`);
  console.log('- valid:');
  printBucket(b.valid);
  console.log('- alias_fixable:');
  printBucket(b.alias);
  console.log('- invalid_unknown:');
  printBucket(b.invalid);
}

async function fetchAllPages<T>(supabase: SupabaseClient, table: string, select: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`[${table}] ${error.message}`);
    const rows = (data ?? []) as T[];
    if (rows.length === 0) break;
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

type UserRow = {
  id: string;
  primary_trade: string | null;
  additional_trades: string[] | null;
};

type JobRow = { id: string; trade_category: string };

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const buckets = {
    'users.primary_trade': emptyBuckets(),
    'users.additional_trades (elements)': emptyBuckets(),
    'jobs.trade_category': emptyBuckets(),
  } as const satisfies Record<string, BucketMaps>;

  let totalValid = 0;
  let totalAlias = 0;
  let totalInvalid = 0;

  function countClassify(c: Classify) {
    switch (c.kind) {
      case 'empty':
        break;
      case 'valid':
        totalValid++;
        break;
      case 'alias_fixable':
        totalAlias++;
        break;
      case 'invalid_unknown':
        totalInvalid++;
        break;
    }
  }

  console.log(FIX ? '=== TRADE AUDIT + FIX MODE ===\n' : '=== TRADE AUDIT REPORT ===\n');
  console.log(
    `Canonical list: ${TRADES.length} trades; ${Object.keys(TRADE_ALIASES).length} alias keys loaded.\n`
  );

  const users = await fetchAllPages<UserRow>(supabase, 'users', 'id, primary_trade, additional_trades');

  for (const u of users) {
    if (u.primary_trade != null && String(u.primary_trade).trim() !== '') {
      const c = classifyValue(u.primary_trade);
      recordClassification(buckets['users.primary_trade'], c);
      countClassify(c);
      if (c.kind === 'invalid_unknown') {
        addReview('users', u.id, 'primary_trade', c.raw, null);
      }
    }

    if (Array.isArray(u.additional_trades) && u.additional_trades.length > 0) {
      for (const el of u.additional_trades) {
        const c = classifyValue(el);
        recordClassification(buckets['users.additional_trades (elements)'], c);
        countClassify(c);
        if (c.kind === 'invalid_unknown') {
          addReview('users', u.id, 'additional_trades', c.raw, null);
        }
      }
    }

  }

  const jobs = await fetchAllPages<JobRow>(supabase, 'jobs', 'id, trade_category');
  for (const j of jobs) {
    if (j.trade_category == null || String(j.trade_category).trim() === '') continue;
    const c = classifyValue(j.trade_category);
    recordClassification(buckets['jobs.trade_category'], c);
    countClassify(c);
    if (c.kind === 'invalid_unknown') {
      addReview('jobs', j.id, 'trade_category', c.raw, null);
    }
  }

  for (const [name, b] of Object.entries(buckets)) {
    printSourceReport(name, b);
  }

  console.log('\n=== SUMMARY (non-empty values) ===');
  console.log(`- total valid value occurrences: ${totalValid}`);
  console.log(`- total alias-fixable value occurrences: ${totalAlias}`);
  console.log(`- total unknown invalid value occurrences: ${totalInvalid}`);

  const tmpDir = join(ROOT, 'tmp');
  mkdirSync(tmpDir, { recursive: true });
  const reviewPath = join(tmpDir, 'trade-audit-review.json');

  if (reviewItems.length > 0) {
    writeFileSync(reviewPath, JSON.stringify(reviewItems, null, 2), 'utf8');
    console.log(`\nWrote ${reviewItems.length} manual review item(s) to ${reviewPath}`);
  } else {
    console.log('\nNo invalid_unknown values — tmp/trade-audit-review.json not written.');
  }

  if (!FIX) {
    console.log('\n(Dry run only. Run npm run trade:audit:fix to apply alias fixes.)');
    return;
  }

  console.log('\n--- APPLY FIXES (alias-fixable only) ---\n');

  for (const u of users) {
    const pt = shouldFixScalar(u.primary_trade);
    if (pt.fix) {
      const oldVal = u.primary_trade;
      const { error } = await supabase.from('users').update({ primary_trade: pt.next }).eq('id', u.id);
      if (error) {
        console.error(`[trade-audit:fix] FAILED users.primary_trade id=${u.id}`, error.message);
      } else {
        console.log(
          `[trade-audit:fix] table=users id=${u.id} field=primary_trade old=${JSON.stringify(oldVal)} new=${JSON.stringify(pt.next)}`
        );
      }
    }

    if (Array.isArray(u.additional_trades) && u.additional_trades.length > 0) {
      const canon = tryCanonicalizeArray(u.additional_trades);
      if (canon.ok && !arraysEqualAsTextArray(u.additional_trades, canon.values)) {
        const { error } = await supabase.from('users').update({ additional_trades: canon.values }).eq('id', u.id);
        if (error) {
          console.error(`[trade-audit:fix] FAILED users.additional_trades id=${u.id}`, error.message);
        } else {
          console.log(
            `[trade-audit:fix] table=users id=${u.id} field=additional_trades old=${JSON.stringify(u.additional_trades)} new=${JSON.stringify(canon.values)}`
          );
        }
      }
    }

  }

  for (const j of jobs) {
    const fix = shouldFixScalar(j.trade_category);
    if (!fix.fix) continue;
    const oldVal = j.trade_category;
    const { error } = await supabase.from('jobs').update({ trade_category: fix.next }).eq('id', j.id);
    if (error) {
      console.error(`[trade-audit:fix] FAILED jobs.trade_category id=${j.id}`, error.message);
    } else {
      console.log(
        `[trade-audit:fix] table=jobs id=${j.id} field=trade_category old=${JSON.stringify(oldVal)} new=${JSON.stringify(fix.next)}`
      );
    }
  }

  console.log('\nFix pass complete. Re-run npm run trade:audit to verify.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
