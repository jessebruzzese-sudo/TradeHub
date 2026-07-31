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
	const claims = await getClaims();
	try{
		const { jobs, users } = await getDataService();
		const profile = await users.getUserProfile(claims.id);
		const business = profile?.business ?? null;
		if(business === null){
			return NextResponse.json({msg:"User is not linked with a business"}, {status: 500});
		}
		const searchParams = request.nextUrl.searchParams;
		const sortBy = searchParams.get("sortBy") ?? null;
		const location = { latitude: Number(business.locationLat), longitude: Number(business.locationLng) };
		const near = await jobs.getJobsNear(location, profile.profile.id); // +/- 1 lat/long
		const premium = profile?.profile?.premium ?? false;
		const primaryTrade = business?.primaryTrade;
		const radius = premium ? 100 : 20;
		const mapped = near.map((e,i)=>{ return {
				...e, 
				distance: haversineKm(e.latitude, e.longitude, location.latitude, location.longitude) 
			}; 
		});
		const refined = mapped.filter((x)=>x.distance <= radius);
		if(refined.length === 0){
			return NextResponse.json([], {status: 200});
		}
		// sort jobs
		// based off either nearest distance
		// or newest posting
		const sorting = {
			"newest": (l, r) => { return r.createdAt.getTime() - l.createdAt.getTime() },
			"nearest": (l, r) => { return l.distance - r.distance }
		};
		if(sortBy !== null){
			refined.sort(sorting[sortBy]);
		}
		const ids = refined.map((e,i)=>e.id);
		const results = await jobs.getJobsForIds(ids);
		for(const j of results){
			const key = j.id;
			const match = refined.find((x)=>x.id === key);
			if(match){
				j.distance = match.distance;
			}
		}
		// premium? return everything
		if(premium){
			return NextResponse.json(results, {status: 200});
		}
		// else filter by trade
		const tradeFiltered = results.filter((x)=>x.tradeCategory === primaryTrade);
		return NextResponse.json(tradeFiltered, {status: 200});
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to search jobs"}, {status: 500});
	}
}
