// vim: ts=2
import { NextResponse, NextRequest } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function PUT(request:NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	const { users } = await getDataService();
	try{
		await users.updateLastActive(email);	
	}catch(err_){
		console.log(err_);
		return NextResponse.json({msg:"Failed to update last active", error:err_}, {status:500});
	}
  return NextResponse.json({ ok: true});
}

