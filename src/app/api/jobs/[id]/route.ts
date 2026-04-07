import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import { loadActiveTradeNames, resolveTradeAgainstCatalog } from '@/lib/trades/load-active-trades';
import { getTier } from '@/lib/plan-limits';
import { isAdmin } from '@/lib/is-admin';
import { refreshProfileStrength } from '@/lib/profile-strength';
import { getListedTradesForJobEligibility } from '@/lib/trades/user-trades';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';
import { hasContractorRoleForJobPosting } from '@/lib/permissions';
import {
  JOB_EDIT_CONTRACTOR_ROLE_MESSAGE,
  JOB_POST_CONTRACTOR_ROLE_CODE,
} from '@/lib/jobs/job-post-role-messages';

function isJobsRlsOrPermissionError(err: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(err?.code ?? '');
  const msg = String(err?.message ?? '').toLowerCase();
  return (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('violates row-level security') ||
    msg.includes('permission denied for table') ||
    msg.includes('new row violates row-level security')
  );
}

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/jobs/[id] — Hard delete a job (owner or admin only).
 * - Deletes storage attachments, then the job row.
 * - Related records cascade or are cleaned up by DB constraints.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    console.log('[jobs delete] start', { jobId });

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      console.log('[jobs delete] auth failed', { authErr: authErr?.message });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[jobs delete] user', { userId: user.id });

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, contractor_id, attachments')
      .eq('id', jobId)
      .gte('created_at', jobsListingWindowStartIso())
      .maybeSingle();

    if (jobErr) {
      console.error('[jobs delete] job lookup error', jobErr);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!job) {
      console.log('[jobs delete] job not found', { jobId });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    console.log('[jobs delete] job found', { contractorId: job.contractor_id });

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    const isOwner = job.contractor_id === user.id;
    const isAdminUser = dbUser ? isAdmin(dbUser) : false;

    if (!isOwner && !isAdminUser) {
      console.log('[jobs delete] forbidden', { isOwner, isAdminUser });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceSupabase = createServiceSupabase();

    // 1. Parse and delete storage objects from job.attachments (resilient - do not abort on storage failures)
    const rawAttachments = job.attachments;
    let attachmentItems: Array<{ bucket?: string; path?: string }> = [];
    try {
      let raw: unknown[] = [];
      if (Array.isArray(rawAttachments)) {
        raw = rawAttachments;
      } else if (rawAttachments && typeof rawAttachments === 'object' && Array.isArray((rawAttachments as { files?: unknown[] }).files)) {
        raw = (rawAttachments as { files: unknown[] }).files;
      } else if (typeof rawAttachments === 'string') {
        const parsed = JSON.parse(rawAttachments) as unknown;
        raw = Array.isArray(parsed) ? parsed : [];
      }
      attachmentItems = raw
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => ({ bucket: x.bucket as string | undefined, path: (x.path ?? x.file_path) as string | undefined }));
    } catch (parseErr) {
      console.warn('[jobs delete] attachments parse warning', parseErr);
    }
    console.log('[jobs delete] attachments', { count: attachmentItems.length, items: attachmentItems });

    const storagePaths: string[] = [];
    for (const a of attachmentItems) {
      const path = a?.path;
      if (path && typeof path === 'string' && path.trim()) {
        storagePaths.push(path.trim());
      }
    }

    if (storagePaths.length > 0) {
      const bucket = 'job-attachments';
      console.log('[jobs delete] deleting storage paths', { bucket, paths: storagePaths });
      const { error: storageErr } = await serviceSupabase.storage.from(bucket).remove(storagePaths);
      if (storageErr) {
        console.warn('[jobs delete] storage remove warning (continuing)', storageErr);
        // Do not abort - job may have been created before storage; orphaned files are acceptable
      }
    }

    // 2. Hard delete job (DB cascades: applications, reviews, notifications, reliability_events; conversations get job_id SET NULL)
    console.log('[jobs delete] deleting job row');
    const { error: deleteErr } = await serviceSupabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .gte('created_at', jobsListingWindowStartIso());

    if (deleteErr) {
      console.error('[jobs delete] job row delete failed', deleteErr);
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      );
    }
    const contractorId = job.contractor_id as string;
    try {
      await refreshProfileStrength(contractorId);
    } catch {
      // non-blocking: counters + strength sync
    }
    console.log('[jobs delete] success');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[jobs delete] failed', err);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/[id] — Update a job with server-side trade validation.
 * - Free users: trade_category must be one of their listed trades.
 * - Premium users: trade_category may be any valid TradeHub trade.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, contractor_id')
      .eq('id', jobId)
      .gte('created_at', jobsListingWindowStartIso())
      .maybeSingle();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: actor, error: actorErr } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (actorErr || !actor) {
      return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
    }

    if (!hasContractorRoleForJobPosting(actor as { role?: string | null })) {
      return NextResponse.json(
        { error: JOB_EDIT_CONTRACTOR_ROLE_MESSAGE, code: JOB_POST_CONTRACTOR_ROLE_CODE },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const tradeCategory = typeof body?.trade_category === 'string' ? body.trade_category.trim() : undefined;

    let tradeCategoryResolved: string | undefined;

    if (tradeCategory !== undefined) {
      if (!tradeCategory) {
        return NextResponse.json({ error: 'Trade category cannot be empty' }, { status: 400 });
      }

      let catalogNames: string[];
      try {
        catalogNames = await loadActiveTradeNames(supabase);
      } catch {
        return NextResponse.json({ error: 'Could not load trade catalog' }, { status: 500 });
      }

      const resolved = resolveTradeAgainstCatalog(tradeCategory, catalogNames);
      if (!resolved) {
        return NextResponse.json(
          { error: `Invalid trade category. Must be one of: ${catalogNames.join(', ')}` },
          { status: 400 }
        );
      }
      tradeCategoryResolved = resolved;

      const { data: profile, error: profileErr } = await (supabase as any)
        .from('users')
        .select('id, role, plan, subscription_status, complimentary_premium_until, primary_trade, additional_trades')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr || !profile) {
        return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
      }

      const isPremium = getTier(profile) === 'premium';

      if (!isPremium) {
        const userTrades = getListedTradesForJobEligibility(profile as any);
        if (!userTrades.includes(tradeCategoryResolved)) {
          return NextResponse.json(
            { error: 'Free accounts can only post jobs in their listed trade(s). Upgrade to Premium to post in any trade.' },
            { status: 403 }
          );
        }
      }
    }

    const title = typeof body?.title === 'string' ? body.title.trim() : undefined;
    const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
    const location = typeof body?.location === 'string' ? body.location.trim() : undefined;
    const postcode = typeof body?.postcode === 'string' ? body.postcode.trim() : undefined;
    const dates = body?.dates;
    const startTime = typeof body?.start_time === 'string' ? body.start_time : undefined;
    const duration = body?.duration;
    const payType =
      body?.pay_type === 'hourly'
        ? 'hourly'
        : body?.pay_type === 'day_rate'
          ? 'day_rate'
          : body?.pay_type === 'fixed'
            ? 'fixed'
            : undefined;
    const rate = typeof body?.rate === 'number' ? body.rate : body?.rate != null ? Number(body.rate) : undefined;
    const attachments = body?.attachments;

    const updatePayload: Record<string, unknown> = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (tradeCategoryResolved !== undefined) updatePayload.trade_category = tradeCategoryResolved;
    if (location !== undefined) updatePayload.location = location;
    if (postcode !== undefined) updatePayload.postcode = postcode;
    if (Array.isArray(dates)) updatePayload.dates = dates;
    if (startTime !== undefined) updatePayload.start_time = startTime;
    if (duration !== undefined) updatePayload.duration = duration;
    if (payType !== undefined) updatePayload.pay_type = payType;
    if (rate !== undefined)
      updatePayload.rate = rate != null && Number.isFinite(rate) && rate > 0 ? rate : null;
    if (attachments !== undefined) updatePayload.attachments = attachments;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updatePayload.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .eq('contractor_id', user.id)
      .gte('created_at', jobsListingWindowStartIso());

    if (updateErr) {
      console.error('[api/jobs/[id]] update error:', updateErr);
      if (isJobsRlsOrPermissionError(updateErr)) {
        return NextResponse.json(
          { error: JOB_EDIT_CONTRACTOR_ROLE_MESSAGE, code: JOB_POST_CONTRACTOR_ROLE_CODE },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: updateErr?.message || 'Failed to update job' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/jobs/[id]] error:', err);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
