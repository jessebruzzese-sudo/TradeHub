// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import { haversineKm } from "@/lib/discovery";
import * as jose from "jose";
import * as z from "zod";

const getClaims = async () => {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	return jose.decodeJwt(jwt);
}

export async function GET(request: NextRequest){
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({msg:"Not authorized"}, {status: 401});
	}
	try{
		const { jobs, users } = await getDataService();
		const profile = await users.getUserProfile(claims.id);
		const business = profile?.business ?? null;
		if(business === null){
			return NextResponse.json({msg:"User is not linked with a business"}, {status: 500});
		}
		const location = { latitude: business.locationLat, longitude: business.locationLng };
		const near = await jobs.getJobsNear(location, claims.id); // +/- 1 lat/long
		const premium = profile?.profile?.premium ?? false;
		const radius = premium ? 100 : 20;
		const refined = near.filter((x)=>haversineKm(x.latitude, x.longitude, location.latitude, location.longitude) <= radius);
		if(refined.length === 0){
			return NextResponse.json([], {status: 200});
		}
		const ids = refined.map((e,i)=>e.id);
		const results = await jobs.getJobsForIds(ids);
		return NextResponse.json(results, {status: 200});
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to search jobs"}, {status: 500});
	}
}
