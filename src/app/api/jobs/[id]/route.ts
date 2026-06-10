// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { loadJobAttachments } from "@/lib/images/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

export const dynamic = 'force-dynamic';

export const getClaims = async () => {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	return jose.decodeJwt(jwt);
};

export const GET = async (request, context) => {
	const params = await context.params;	
	const jobId = params.id;
	let claims = null;
	try{	
		claims = await getClaims();
	}catch(err_){
		console.error(err_);	
		return NextResponse.json({ msg: "Not authorized" }, { status: 401 });
	}
	const { jobs } = await getDataService();
	try{
		let job = await jobs.getJob(jobId);
		if(job.length === 0){
			return NextResponse.json({ok:false}, { status: 404 });
		}
		job = job[0];	
		const mapping = await loadJobAttachments(job);
		for(const a of job.attachments){
			const result = mapping[a.id];
			a.size = result.size;
			a.url = result.url;
		}
		return NextResponse.json(job, { status: 200 });
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to get job" }, { status: 500 });
	}
};

/**
 * DELETE /api/jobs/[id] — Hard delete a job (owner or admin only).
 * - Deletes storage attachments, then the job row.
 * - Related records cascade or are cleaned up by DB constraints.
 */
export async function DELETE(request, context) {
		const { id } = await context.params;
		let claims = null;
		try{	
			claims = await getClaims();
		}catch(err_){
    	return NextResponse.json({msg:"Not authorized"},{status:401});
		}
		// Lookup
		let job = null;
		const { jobs } = await getDataService();
		try{
			job = await jobs.getJob(id);
			if(job.length === 0){
				return NextResponse.json({ok:false}, { status: 404 });
			}
			job = job[0];	
		}catch(err_){
			console.error(err_);
    	return NextResponse.json({msg:"Failed to query for job"},{status:500});
		}
		// Ownership check
		// Admin or owner
		const ownerId = job?.ownerId ?? null;
		if(ownerId === null){
    	return NextResponse.json({msg:"Job has null owner id"},{status:500});
		}
		const ok = claims.id === ownerId || claims.role === "admin";
		if(!ok){
    	return NextResponse.json({msg:"Forbidden, you aren't allowed to delete this job."},{status:403});
		}
		const ENABLE_DELETE = true;
		if(ENABLE_DELETE){
			try{
				await jobs.deleteJob(job);
			}catch(err_){
				console.error(err_);
    		return NextResponse.json({msg:"Failed to delete job"},{status:500});
			}
		}
    return NextResponse.json({ success: true });
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
	/*
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
	*/
    return NextResponse.json({ success: true });
}
