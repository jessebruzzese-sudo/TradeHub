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

const JobAttachmentSchema = z.object({
	fileName: z.string(),
	mime: z.string(),
	data: z.string().optional(), // could exist (new)
	id: z.string().optional() // could exist (existing)
});

const JobUpdateSchema = z.object({
	title: z.string(),
	description: z.string(),
	tradeCategory: z.string(),
	location: z.string(),
	placeId: z.string().nullable(),
	latitude: z.number(),
	longitude: z.number(),
	postcode: z.string(),
	payType: z.string(),
	rate: z.number(),
	startTime: z.string(),
	durationDays: z.number().int(),
	dates: z.array(z.string().datetime()),
	attachments: z.array(JobAttachmentSchema)
});

/**
 * PUT /api/jobs/[id] — Update a job with server-side trade validation.
 * - Free users: trade_category must be one of their listed trades.
 * - Premium users: trade_category may be any valid TradeHub trade.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
		const claims = await getClaims();
    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }
		let payload = null;
		try{	
			payload = JobUpdateSchema.parse(await request.json());
		}catch(err_){
			console.error(`PUT\t/api/jobs/[id]\t${err_}`);
      return NextResponse.json({ error: "Failed to parse payload" }, { status: 400 });
		}
		if(payload === null){
      return NextResponse.json({ error: "Payload was null" }, { status: 500 });
		}
		const { users: usersRepo, jobs: jobsRepo } = await getDataService();
		// look up job
		let existingJob = null;
		try{
			existingJob = await jobsRepo.getJob(jobId);
		}catch(err__){
      return NextResponse.json({ error: `Failed to retrieve job ${jobId}` }, { status: 500 });
		}
		if(existingJob === null || existingJob.length === 0){
      return NextResponse.json({ error: `Job ${jobId} doesn't exist` }, { status: 404 });
		}
		existingJob = existingJob[0];
		// admin or owners can edit
		const isAdmin = claims.role === "admin";
		const canEdit = isAdmin || (!isAdmin && existingJob.owner.id === claims.id);
		if(!canEdit){
      return NextResponse.json({ error: "Forbidden, not allowed to edit this job." }, { status: 403 });
		}
		// grab profile
		// checking premium status
		const user_ = await usersRepo.getUserProfile(claims.id);
		const premium = user_?.profile?.premium ?? false;
		if(!premium){
			const pt = user_?.business?.primaryTrade ?? null;	
			if(pt === null){
      	return NextResponse.json({ error: "Users primary trade is not set" }, { status: 500 });
			}
			if(pt !== payload.tradeCategory){
      	return NextResponse.json({ error: "Free users can only post jobs with their primary trade" }, { status: 400 });
			}
		}else{
			// TODO
			// make sure that trade exist
		}
		// dry run for checking validations
		// are working correctly, before testing transaction
		const DRY = false;
		if(DRY){
    	return NextResponse.json({ 
				success: true, 
				isAdmin, 
				premium,
				ownerId: existingJob.owner.id, 
				userId: claims.id, 
				primaryTrade: user_?.business?.primaryTrade ?? null, 
				tradeCategory: payload.tradeCategory 
			});
		}
		try{
			// fill existing job with payload data
			for(const key of Object.keys(payload)){
				if(key === "attachments"){
					continue;
				}
				existingJob[key] = payload[key];
			}
			// synchronise attachments
			// find existing attachments in payload
			const delta = {};
			const added = [];
			for(const a of payload.attachments){
				const id = a?.id ?? null;
				a.create = false;
				// check for no id
				// if not set, means new attachment
				if(id === null){
					a.create = true;
					added.push(a);
					continue;
				}
				delta[id] = a;
			}
			for(const a of existingJob.attachments){
				const exists = delta[a.id] ?? null;
				a.delete = exists === null;
			}
			existingJob.attachments = [...existingJob.attachments, ...added];
			await jobsRepo.updateJob(existingJob);
		}catch(err_){
			console.error(`PUT\t/api/jobs/[id]\t${err_}`);
			return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
		}
    return NextResponse.json({ success: true });
}
