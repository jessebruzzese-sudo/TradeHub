import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type StoredAttachment = { bucket?: string; path?: string };

/**
 * GET/POST /api/cron/cleanup-expired-tenders
 * Hard deletes tenders past retention: 90d for PREMIUM_14, 30d for FREE_TRIAL/BASIC_8.
 * Requires CRON_SECRET (Vercel sends as Authorization: Bearer). Used by Vercel cron for full cleanup (DB + storage).
 */
async function runCleanup(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('x-cron-secret') ?? '';
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  const bucket = 'tender-attachments';
  const cutoffPremium = new Date();
  cutoffPremium.setDate(cutoffPremium.getDate() - 90);
  const cutoffFree = new Date();
  cutoffFree.setDate(cutoffFree.getDate() - 30);

  const [premiumRes, freeRes] = await Promise.all([
    svc.from('tenders').select('id, tier, shared_attachments').eq('tier', 'PREMIUM_14').lt('created_at', cutoffPremium.toISOString()),
    svc.from('tenders').select('id, tier, shared_attachments').in('tier', ['FREE_TRIAL', 'BASIC_8']).lt('created_at', cutoffFree.toISOString()),
  ]);

  if (premiumRes.error || freeRes.error) {
    console.error('[cron cleanup-expired-tenders] fetch error', premiumRes.error ?? freeRes.error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }

  const list = [...(premiumRes.data ?? []), ...(freeRes.data ?? [])];
  let deleted = 0;

  for (const tender of list) {
    const tenderId = tender.id;

    // 1. Storage cleanup
    const rawAttachments = tender.shared_attachments as unknown;
    let attachmentItems: StoredAttachment[] = [];
    try {
      const raw = Array.isArray(rawAttachments) ? rawAttachments : [];
      attachmentItems = raw
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => ({ bucket: x.bucket as string | undefined, path: (x.path ?? x.file_path) as string | undefined }));
    } catch {
      /* ignore */
    }
    for (const a of attachmentItems) {
      const path = a?.path;
      if (path && typeof path === 'string' && path.trim().startsWith(`tenders/${tenderId}/`)) {
        try {
          await svc.storage.from(a.bucket || bucket).remove([path]);
        } catch {
          /* best-effort */
        }
      }
    }
    try {
      const collectPaths = async (prefix: string): Promise<string[]> => {
        const paths: string[] = [];
        const { data: items, error: listErr } = await svc.storage.from(bucket).list(prefix, { limit: 1000 });
        if (listErr || !items?.length) return paths;
        for (const item of items) {
          const fullPath = `${prefix}/${item.name}`;
          if (item.id) paths.push(fullPath);
          else paths.push(...(await collectPaths(fullPath)));
        }
        return paths;
      };
      const orphanPaths = await collectPaths(`tenders/${tenderId}`);
      if (orphanPaths.length > 0) await svc.storage.from(bucket).remove(orphanPaths);
    } catch {
      /* best-effort */
    }

    // 2. DB delete
    const { error: delErr } = await svc.from('tenders').delete().eq('id', tenderId);
    if (!delErr) deleted++;
  }

  return NextResponse.json({ ok: true, deleted, total: list.length });
}

export async function GET(request: NextRequest) {
  return runCleanup(request);
}

export async function POST(request: NextRequest) {
  return runCleanup(request);
}
