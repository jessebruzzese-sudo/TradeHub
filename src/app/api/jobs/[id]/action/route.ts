// vim: ts=2
// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export const dynamic = 'force-dynamic';

const SELECT_ACTION = "select";
const ACCEPT_ACTION = "accept";
const DECLINE_ACTION = "decline";
const CONFIRM_ACTION = "confirm";

const JOB_OPEN_STATUS = "open";
const JOB_ACCEPTED_STATUS = "accepted";

const VALID_ACTIONS = [ SELECT_ACTION, ACCEPT_ACTION, DECLINE_ACTION, CONFIRM_ACTION ];

const doSelectApplication = async (job:any, owner:boolean, applicationId:any) => {
	if (job.status !== JOB_OPEN_STATUS) {
		return NextResponse.json({ error: 'Job is not in open state' }, { status: 400 });
	}
	if (!owner) {
		return NextResponse.json({ error: 'Only job owner can select an application' }, { status: 403 });
	}
	let app = null;
	try{
		app = await getApplication(applicationId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query application" }, { status: 500 });
	}
	const { jobs: jobsRepo } = await getDataService();
	let conversationId = null;
	try{
		// update job status to accepted
		// create linkage between job and application
		// update application status to selected
		// send email to job recipient
		conversationId = await jobsRepo.selectApplication(job, app);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to select application" }, { status: 500 });
	}
	return NextResponse.json({ ok: true, conversationId }, { status: 200 });
};

const getApplication = async (applicationId:string) => {
	return new Promise(async(resolve, reject)=>{	
		const { applications: appRepo } = await getDataService();
		let results = null;
		try{
			results = await appRepo.getApplication(applicationId);
		}catch(err_){
			console.error(err_);
			reject(err_);
			return;
		}
		if(results === null){
			reject(new Error("Results were null"));
			return;
		}
		if(results.length === 0){
			reject(new Error("No results could be found"));
			return;
		}
		resolve(results[0]);
	});
};

const doConfirmJob = async (job:any, owner:boolean, appId:string) => {
	if(appId === null){
		return NextResponse.json({ error: "Application id is required" }, { status: 400 });
	}
	if(job.status !== JOB_OPEN_STATUS){
		return NextResponse.json({ error: "Job is not in open state" }, { status: 400 });
	}
	if(!owner){
		return NextResponse.json({ error: "Only job owner can confirm hire" }, { status: 403 });
	}
	const { jobs: jobsRepo } = await getDataService();
	let selected = null;
	try{
		selected = await jobsRepo.getAcceptedApplications(job.id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query for selected applications" }, { status: 500 });
	}
	if(selected === null){
		return NextResponse.json({ error: "Selected applications array was null" }, { status: 500 });
	}
	if(selected.length === 0){
		return NextResponse.json({ error: "No applications are selected" }, { status: 500 });
	}
	const app = selected.find((x) => x.id === appId);
	if(app === undefined){
		return NextResponse.json({ error: `Could not find application ${appId} to confirm` }, { status: 500 });
	}
	try{
		await jobsRepo.confirmJob(job, app);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to confirm job" }, { status: 500 });
	}
	return NextResponse.json({ ok: true }, { status: 200 });
};

const doDeclineApplication = async () => {

};

/**
 * POST /api/jobs/[id]/action
 * Body: { action: 'accept' | 'decline' | 'confirm' | 'select', applicationId?: string }
 * - select: contractor selects a subcontractor (requires applicationId)
 * - accept: subcontractor accepts job offer
 * - decline: subcontractor declines job offer
 * - confirm: contractor confirms hire
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
	// grab claims for logged in user id
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
	// grab job id from route
	const { id: jobId } = await ctx.params;
	if (!jobId) {
		return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
	}
	// grab payload from request
	const body = await request.json();
	const action = body?.action ?? null;
	if (!action || !VALID_ACTIONS.includes(action)) {
		return NextResponse.json({ error: 'action must be accept, decline, confirm, or select' }, { status: 400 });
	}
	// application is not required for all actions
	const applicationId = body?.applicationId ?? null;
	// find job
	const { jobs: jobsRepo, applications: appRepo, profile: profileRepo } = await getDataService();
	let results = null;
	try{
		results = await jobsRepo.getJob(jobId);
	}catch(err_){
		return NextResponse.json({ error: "Failed to query job" }, { status: 500 });
	}
	if(results === null){
		return NextResponse.json({ error: "Results are null" }, { status: 500 });
	}
	if(results.length === 0){
		return NextResponse.json({ error: `No results could be found for job id ${jobId}` }, { status: 404 });
	}
	const job = results[0];
	// find owner profile
	let profileId = null;
	try{
		profileId = await profileRepo.getProfileId(claims.id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: `Failed to query profile id for claim ${claims.id}` }, { status: 500 });
	}
	if(profileId === null){
		return NextResponse.json({ error: `Profile id was null for claim ${claims.id}` }, { status: 500 });
	}
	// set ownership flag
	// only owners are allowed to perform certain actions
	const isJobOwner = job.profileId === profileId;
	// call appropriate function
	// we can atleast keep the code here readable
	// via delegating to function
	if(action === SELECT_ACTION){
		return doSelectApplication(job, isJobOwner, applicationId);
	}else if(action === CONFIRM_ACTION){
		return doConfirmJob(job, isJobOwner, applicationId);
	}else{
		return NextResponse.json({ error: `Action ${action} fell through` }, { status: 500 });
	}
}
