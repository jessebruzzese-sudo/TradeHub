// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as z from "zod";

const CancelJobSchema = z.object({
	reason: z.string().optional().nullable(),
	wasConfirmed: z.boolean(),
	cancelledBy: z.string()
});

// mark job as cancelled
// change job status to cancelled
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
	let payload = null;
	try{
		payload = CancelJobSchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({ msg: "Invalid payload" }, { status: 400 });
	}
	const { jobs: jobRepo, users: userRepo } = await getDataService();
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
	// confirm cancelled by
	// make sure that user is admin or job owner
	const cancelledByAdmin = await userRepo.isUserAdmin(payload.cancelledBy);
	const valid = job.owner.id === payload.cancelledBy || cancelledByAdmin;
	if(!valid){
		return NextResponse.json({ msg: "User that cancelled job is not admin or owner" }, { status: 400 });
	}
	// process the job cancellation
	// change job status
	// set cancellation fields
	// send email, messages
	try{
		await jobRepo.cancelJob(job, payload);	
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to cancel job" }, { status: 500 });
	}
	return NextResponse.json({ msg: "Job cancelled" }, { status: 200 });
};
