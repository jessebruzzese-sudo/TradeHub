// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function GET(request: NextRequest) {
	const { id: userId } = await getClaims();
	try{
		const { business } = await getDataService();
		result = await business.getUserBusiness(userId);
	}catch(err_){
		return NextResponse.json({msg:"Failed to get user business"}, {status:500});
	}
	return NextResponse.json(result, {status: 200});
}

const BusinessUpdateSchema = z.object({
	abn: z.string().optional(),	
	abnEntityName: z.string().optional().nullable(),
	abnEntityType: z.string().optional().nullable(),
	abnGstActiveDate: z.string().date().optional().nullable(), // not timestamp
	abnVerified: z.boolean().optional()
});

export async function PUT(request: NextRequest) {
	const { id: userId } = await getClaims();
	let delta = null;
	try{
		delta = BusinessUpdateSchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({msg:"Failed to parse payload", error: err_}, {status:400});
	}
	try{
		const { business } = await getDataService();
		await business.updateBusiness(userId, delta);
	}catch(err_){
		return NextResponse.json({msg:"Failed to update business"}, {status:500});
	}
	return NextResponse.json({ok:true}, {status: 200});
}
