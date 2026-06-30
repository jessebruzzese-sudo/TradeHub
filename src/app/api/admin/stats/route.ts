export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";

export async function GET(request:NextRequest, context:any) {
	const { id: userId, role } = await getClaims();
	// only admin users are accepted here
	if(role?.toLowerCase() !== "admin"){
		return NextResponse.json({ error: "Forbidden" }, {status: 403})	
	}
  try{
		const { jobs: jobsRepo, users: userRepo } = await getDataService();
		const breakdown = await jobsRepo.getJobStatusBreakdown();
		const totalJobs = Object.keys(breakdown).reduce((a, c)=>{
			const n = breakdown[c];
			return a + n;
		}, 0);
    return NextResponse.json({
      totalUsers: await userRepo.getCustomerCount(), // count of non admin users
      pendingVerifications: 0,
      confirmedJobs: breakdown.confirmed ?? 0, // nunber of jobs that have a confirmed hire
      acceptedJobs: breakdown.accepted ?? 0, // number of jobs that have an accepted application
      openJobs: breakdown.open ?? 0, // number of jobs that are still open
      closedJobs: breakdown.closed ?? 0, // number of jobs that are closed
      totalJobs: totalJobs, // sum of above
      generatedAt: new Date().toISOString(),
    });
  }catch(err_){
		console.error(err_);
		return NextResponse.json({error:"Could not query admin stats"}, {status:500})
  }
}
