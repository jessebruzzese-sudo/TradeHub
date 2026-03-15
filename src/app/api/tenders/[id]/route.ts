import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/is-admin';

export const dynamic = 'force-dynamic';

type StoredAttachment = { bucket?: string; path?: string };

/**
 * GET /api/tenders/[id] — Fetch tender for viewer (view access: owner, admin, or discoverable).
 * Reuses get_tender_for_viewer RPC — same discovery logic as Find Work.
 * Returns 404 if tender not found or viewer has no view access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenderId } = await params;

    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_tender_for_viewer', {
      p_tender_id: tenderId,
      p_viewer_id: user.id,
    });

    if (rpcErr) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[tenders GET] get_tender_for_viewer RPC error', rpcErr);
      }
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!row) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const { data: trData } = await supabase
      .from('tender_trade_requirements')
      .select('id,trade,sub_description')
      .eq('tender_id', tenderId);

    const tender = {
      ...row,
      tradeRequirements: trData ?? [],
    };

    return NextResponse.json(tender);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === 'development') {
      console.error('[tenders GET] error', errMsg);
    }
    return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  }
}

/**
 * DELETE /api/tenders/[id] — Hard delete a tender (owner or admin only).
 * - Deletes storage files from shared_attachments
 * - Calls delete_tender RPC to remove tender and all related DB rows
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenderId } = await params;

    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tender, error: tenderErr } = await supabase
      .from('tenders')
      .select('id, builder_id, shared_attachments')
      .eq('id', tenderId)
      .maybeSingle();

    if (tenderErr || !tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    const isOwner = tender.builder_id === user.id;
    const isAdminUser = dbUser ? isAdmin(dbUser) : false;

    if (!isOwner && !isAdminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let serviceSupabase: ReturnType<typeof createServiceSupabase> | null = null;
    try {
      serviceSupabase = createServiceSupabase();
    } catch {
      // Service key may be missing in dev
    }

    // 1. Hard delete tender via RPC, or fallback to direct delete if RPC fails (e.g. migration not applied)
    const { error: rpcErr } = await supabase.rpc('delete_tender', { p_tender_id: tenderId });

    if (rpcErr) {
      const msg = String((rpcErr as Error)?.message || '');
      if (msg.includes('not_owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (msg.includes('tender_not_found')) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
      if (msg.includes('not_authenticated')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      // Fallback: hard delete via service client when RPC fails (e.g. old soft-delete RPC or migration not applied)
      console.warn('[tenders delete] rpc failed, trying direct delete', { msg });
      if (!serviceSupabase) {
        return NextResponse.json(
          { error: 'Could not delete tender', details: process.env.NODE_ENV === 'development' ? msg : undefined },
          { status: 500 }
        );
      }
      const { error: delErr } = await serviceSupabase
        .from('tenders')
        .delete()
        .eq('id', tenderId)
        .eq('builder_id', user.id);

      if (delErr) {
        console.error('[tenders delete] direct delete also failed', delErr);
        return NextResponse.json(
          { error: 'Could not delete tender', details: process.env.NODE_ENV === 'development' ? msg : undefined },
          { status: 500 }
        );
      }
    }

    // 2. Delete storage files from shared_attachments (best-effort cleanup)
    const rawAttachments = tender.shared_attachments as unknown;
    let attachmentItems: StoredAttachment[] = [];
    try {
      const raw = Array.isArray(rawAttachments) ? rawAttachments : [];
      attachmentItems = raw
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => ({ bucket: x.bucket as string | undefined, path: (x.path ?? x.file_path) as string | undefined }));
    } catch {
      // ignore parse errors
    }

    const bucket = 'tender-attachments';
    const svc = serviceSupabase;
    if (svc) {
      for (const a of attachmentItems) {
        const path = a?.path;
        if (path && typeof path === 'string' && path.trim().startsWith(`tenders/${tenderId}/`)) {
          try {
            await svc.storage.from(a.bucket || bucket).remove([path]);
          } catch (storageErr) {
            console.warn('[tenders delete] storage remove warning', { path, err: storageErr });
          }
        }
      }
      try {
        const collectPaths = async (prefix: string): Promise<string[]> => {
          const paths: string[] = [];
          const { data: items, error: listErr } = await svc.storage
            .from(bucket)
            .list(prefix, { limit: 1000 });
          if (listErr || !items?.length) return paths;
          for (const item of items) {
            const fullPath = `${prefix}/${item.name}`;
            if (item.id) paths.push(fullPath);
            else paths.push(...(await collectPaths(fullPath)));
          }
          return paths;
        };
        const orphanPaths = await collectPaths(`tenders/${tenderId}`);
        if (orphanPaths.length > 0) {
          await svc.storage.from(bucket).remove(orphanPaths);
        }
      } catch (orphanErr) {
        console.warn('[tenders delete] orphan storage cleanup skipped', orphanErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error('[tenders delete] error', errMsg, errStack);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errMsg : undefined,
      },
      { status: 500 }
    );
  }
}
