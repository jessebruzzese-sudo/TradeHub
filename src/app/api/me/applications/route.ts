// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as z from "zod";

const ApplicationSchema = z.object({
	jobId: z.uuid(),
	message: z.string()
});

export async function POST(request: NextRequest) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err__){
		return NextResponse.json({error:"Not authorized"}, { status: 401 });
	}
	// parse payload
	// validate
	let payload = null;
	try{
		payload = ApplicationSchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({ msg: "Failed to parse payload" }, { status: 401 });
	}
	// check that job exists
	const { 
		applications: applicationRepo, 
		jobs: jobRepo, 
		profile: profileRepo 
	} = await getDataService();
	let job = null;
	try{
		job = await jobRepo.getJob(payload.jobId);
		if(job.length === 0){
			return NextResponse.json({ msg: `Job ${jobId} doesn't exist` }, { status: 404 });
		}
		job = job[0];
	}catch(err_){
		return NextResponse.json({ msg: `Failed to query for job, id was ${payload.jobId}` }, { status: 500 });
	}
	if(job === null){
		return NextResponse.json({ msg: "Job was null" }, { status: 500 });
	}
	// job must be open
	if(job.status !== "open"){	
		return NextResponse.json({ msg: "Job is not open, cannot accept applications" }, { status: 400 });
	}
	// find profile id of user
	// need to link against job
	let profileId = null;
	try{
		profileId = await profileRepo.getProfileId(claims.id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to query profile id" }, { status: 500 });
	}
	if(profileId === null){
		return NextResponse.json({ msg: "Profile id was null" }, { status: 500 });
	}
	// create application
	// send email to applicant
	// and job owner
	try{
		const applicationId = await applicationRepo.addApplication({...payload, profileId});
		return NextResponse.json({ applicationId }, { status: 200 });
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to query user profile" }, { status: 500 });
	}
}
