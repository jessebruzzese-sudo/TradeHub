// vim: ts=2

import { NextResponse } from 'next/server';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";
import * as z from "zod";

export const dynamic = 'force-dynamic';

export const DELETE = async (request:NextRequest, context:any) => {
	const params = await context.params;
	const jobId = params.id;
	const claims = await getClaims();
	const role = claims?.role?.toLowerCase() ?? "user";
	const isAdmin = role === "admin";
	if(!isAdmin){
		return NextResponse.json({ msg: "Forbidden, admins only." }, { status: 403 });
	}
	const { jobs: jobsRepo } = await getDataService();
	try{	
		const jobResults = await jobsRepo.getJob(jobId);
		const job = jobResults[0] ?? null;
		if(!job){
			return NextResponse.json({ msg: `Job ${jobId} doesn't exist` }, { status: 404 });
		}
		await jobsRepo.deleteJob(job);
		return NextResponse.json({ msg: "Job deleted" }, { status: 200 });
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to delete job" }, { status: 500 });
	}
};

export async function GET(request:NextRequest, context:any) {
	// make sure user is admin
	const claims = await getClaims();
	const role = claims?.role?.toLowerCase() ?? "user";
	const isAdmin = role === "admin";
	if(!isAdmin){
    return NextResponse.json({ msg: "Forbidden, user is not admin." }, { status: 403 });
	}
	// grab params
	const params = await context.params;
	const jobId = params.id;
	// make sure that job id is a uuid
	try{
		const payload = { id: jobId };
		const schema = z.object({id: z.uuid() });
		schema.parse(payload);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to validate job id" }, { status: 400 });
	}
	const { jobs: jobsRepo } = await getDataService();
  try {
		const results = await jobsRepo.getJob(jobId);
		const job = results[0] ?? null;
		if(job === null){
    	return NextResponse.json({ msg: "This job doesn't exist" }, { status: 404 });
		}
		const applications = await jobsRepo.getApplications(jobId);
		const accepted = await jobsRepo.getAcceptedApplications(jobId);
		const confirmed = await jobsRepo.getConfirmedApplications(jobId);
		const response_ = {
			job,		
			applications,
			accepted,
			confirmed
		};
    return NextResponse.json(response_, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ msg: "Failed to query job" }, { status: 500 });
  }
}
