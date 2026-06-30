// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function GET(request: NextRequest, context: RouteContext) {
	const { id: userId } = await getClaims();
	const { profile: profileRepo } = await getDataService();
	let statistics = null;
	try{
		const profileId = await profileRepo.getProfileId(userId);
		statistics = await profileRepo.getStatistics(profileId); 
	}catch(err_){
		console.error(err_);
		return NextResponse.json({error: "Could not load profile statistics"}, { status: 200 });
	}
	return NextResponse.json(statistics, { status: 200 });
}
