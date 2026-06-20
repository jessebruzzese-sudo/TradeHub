// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { loadImage }  from "@/lib/images/service";

// read applications for job
// include applicant information
// avatarUrl
// rating
// completed jobs
export const GET = async (request:any, context:any) => {
	// hooks for debugging
	const query = request.nextUrl.searchParams;
	let HOOK_INCLUDE_IMAGES = query.get("hookIncludeImages") ?? true;
	const environment = process.env.NODE_ENV;
	if(environment !== "development"){
		HOOK_INCLUDE_IMAGES = true;
	}	
	// read job id from route
	const params = await context.params;	
	const jobId = params.id;
	const { jobs: jobRepo } = await getDataService();
	let applications = null;
	try{	
		applications = await jobRepo.getApplications(jobId);
	}catch(err_){
		console.error(err_);	
		return NextResponse.json({ msg: `Failed to query applications for job ${jobId}` }, { status: 500 });
	}
	if(!HOOK_INCLUDE_IMAGES){
		return NextResponse.json(applications, { status: 200 });
	}
	// load images
	for(const a of applications){
		const applicant = a.applicant;
		const url = await loadImage(applicant.avatarDataUrl);
		applicant.avatarDataUrl = url;
	}
	return NextResponse.json(applications, { status: 200 });
};
