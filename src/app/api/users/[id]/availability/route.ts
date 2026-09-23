// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";

export async function GET(request: NextRequest, context:any) {
	let result = null;
	const profileUserId = ( await context.params ).id; // user id of profile that's being viewed
	try{
		const { availability } = await getDataService();
		result = await availability.getAvailability(profileUserId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to read availability record"}, {status:500});
	}
	return NextResponse.json(result, {status: 200});
}

