// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function PUT(request: NextRequest, context: RouteContext) {
	const { id: viewerId } = await getClaims();
	const { id: profileId } = await context.params;
	let ok = false;
	try{
		const { profile: profileRepo } = await getDataService();
		await profileRepo.addProfileView(viewerId, profileId);
		ok = true;
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to register profile view"}, { status: 500 });
	}
	return NextResponse.json({ ok }, { status: 201 });
}
