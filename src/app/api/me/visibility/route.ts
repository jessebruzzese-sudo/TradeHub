// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as z from "zod";

const ChangeVisibilitySchema = z.object({
	public: z.boolean()
});

export async function PUT(request: NextRequest) {
	const claims = await getClaims();
	try{
		payload = ChangeVisibilitySchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({msg:"Invalid payload"}, { status: 400 });
	}
	try{
		const { users } = await getDataService();
		await users.setVisibility(claims.id, payload.public);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	return NextResponse.json({msg:"OK"}, { status: 200});
}
