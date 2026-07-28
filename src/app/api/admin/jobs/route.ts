// vim: ts=2
import { NextResponse } from 'next/server';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";

export const dynamic = 'force-dynamic';

export async function GET(request:NextRequest) {
	// make sure that user is admin
	const claims = await getClaims();
	const role = claims.role;
	if(role?.toLowerCase() !== "admin"){
		return NextResponse.json({ msg: `Forbidden, role was ${role}` }, { status: 403 });
	}
	const { jobs: jobsRepo } = await getDataService();
	const DEFAULT_PAGE_SIZE = 10;
	const DEFAULT_PAGE = 0;
	const searchParams = request.nextUrl.searchParams;
	const sortBy = searchParams.get("sortBy") ?? null;
	const inWindow = searchParams.get("inWindow") ?? "true";
	const searchTerm = searchParams.get("searchTerm")?.toLowerCase() ?? null;
	let pageSize = searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE;
	let page = searchParams.get("page") ?? DEFAULT_PAGE;
	const DAYS_IN_WINDOW = 30;
	let jobs = null;
	let total = null;
	let ids = null;
	const useListingWindow = inWindow === "true";
	try{
		const allJobs = await jobsRepo.getJobIds(sortBy);
		total = allJobs.length;
		if(!useListingWindow){
			ids = allJobs.map((e,i)=>e.id);
		}else{	
			const jobIds = await jobsRepo.getJobIdsInWindow(DAYS_IN_WINDOW, sortBy);
			ids = jobIds.map((e,i)=>e.id);
		}
		jobs = await jobsRepo.getJobsForIds(ids);
		if(jobs === null){
    	return NextResponse.json({ msg: "Jobs results was null" }, { status: 500 });
		}
	}catch(err_){
    console.error(err_);
    return NextResponse.json({ error: err_, msg: "Failed to query jobs" }, { status: 500 });
	}
  try {
    return NextResponse.json({
      ok: true,
      count: total,
      totalInListingWindow: jobs.length,
      jobs
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'CRASHED' }, { status: 500 });
  }
}
