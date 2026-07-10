// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

// mark job as completed
// change job status to completed
// change (confirmed) application status to completed
// send system message
// send email
export const PUT = async (request, context) => {
	const params = await context.params;	
	const jobId = params.id;
	let claims = null;
	try{	
		claims = await getClaims();
	}catch(err_){
		console.error(err_);	
		return NextResponse.json({ msg: "Not authorized" }, { status: 401 });
	}
	const { jobs: jobRepo } = await getDataService();
	// find job
	let job = null;
	try{
		job = await jobRepo.getJob(jobId);
		if(job === null){
			return NextResponse.json({error:`Job array was null`}, { status: 500 });
		}
		if(job.length === 0){
			return NextResponse.json({error:`Failed to find job ${jobId}`}, { status: 404 });
		}
		job = job[0];	
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to get job" }, { status: 500 });
	}
	// find applications
	let applications = null;
	try{
		applications = await jobRepo.getConfirmedApplications(jobId);
		if(applications === null){
			return NextResponse.json({ msg: "Applications array was null" }, { status: 500 });
		}
		if(applications.length === 0){
			return NextResponse.json({ msg: "No confirmed applications could be found" }, { status: 500 });
		}
		if(applications.length > 1){
			return NextResponse.json({ msg: "Too many confirmed applications" }, { status: 500 });
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to query applications for job" }, { status: 500 });
	}
	// process the job completion
	// change app status, job status
	// send email, messaged
	// increment applicant completed jobs
	try{
		const app = applications[0];
		await jobRepo.completeJob(job, app);	
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to complete job" }, { status: 500 });
	}
	return NextResponse.json({ msg: "Job completed" }, { status: 200 });
};
