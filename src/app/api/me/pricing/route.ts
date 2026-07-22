// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function GET(request: NextRequest) {
	const claims = await getClaims();
	let result = null;
	try{
		const { business } = await getDataService();
		result = await business.getPricing(claims.id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query business pricing"}, {status:500});
	}
	return NextResponse.json(result, {status: 200});
}
