// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { loadImage }  from "@/lib/images/service";
import * as z from "zod";

// accept job
// status should accepted
// update updatedAt timestamp and set reason
export const PUT = async (request:any, context:any) => {
	// read job id from route
	const params = await context.params;	
	const jobId = params.id;
	const appId = params.appId;
	const { jobs: jobRepo } = await getDataService();
	let job = null;
	let applications = null;
	try{	
		applications = await jobRepo.getApplications(jobId);
		job = await jobRepo.getJob(jobId);
	}catch(err_){
		console.error(err_);	
		return NextResponse.json({ msg: `Failed to query applications for job ${jobId}` }, { status: 500 });
	}
	if(job === null){
		return NextResponse.json({ msg: "Job results was null" }, { status: 500 });
	}
	if(job.length === 0){
		return NextResponse.json({ msg: `Failed to find job ${jobId}` }, { status: 404 });
	}
	job = job[0];
	if(applications === null){
		return NextResponse.json({ msg: "Applications array was null" }, { status: 500 });
	}
	const app = applications.find((x)=>x.id === appId);
	if(app === undefined){
		return NextResponse.json({ msg: `Applications ${appId} doesn't exist for job` }, { status: 404 });
	}
	try{
		await jobRepo.acceptApplication(job, app);	
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Could not accept application" }, { status: 500 });
	}
	return NextResponse.json({ msg: "Job accepted" }, { status: 200 });
};
