// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

const getClaims = async () => {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	return jose.decodeJwt(jwt);
};

export async function GET(request: NextRequest) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err__){
		return NextResponse.json({error:"Not authorized"}, { status: 401 });
	}
	const { jobs } = await getDataService();
	try{
		const jobs_ = await jobs.getUserJobs(claims.id);
		return NextResponse.json(jobs_, { status: 200 });
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
}
