// vim: ts=2
import { NextResponse, NextRequest } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function PUT(request:NextRequest) {
	const claims = await getClaims();
	const { users } = await getDataService();
	try{
		await users.updateLastActive(claims.id);	
	}catch(err_){
		console.log(err_);
		return NextResponse.json({msg:"Failed to update last active", error:err_}, {status:500});
	}
  return NextResponse.json({ ok: true});
}

