// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function GET(request: NextRequest) {
	let claims = null;
	try{	
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
	const { users: userRepo } = await getDataService();
	let userProfile = null;
	try{
		userProfile = await userRepo.getUserProfile(claims.id);
	}catch(err_){
		return NextResponse.json({ error: "Failed to query user profile" }, { status: 500 });
	}
	if(userProfile === null){
		return NextResponse.json({ error: "User profile was null" }, { status: 500 });
	}
	const location = {
		latitude: userProfile?.business?.latitude ?? null,			
		longitude: userProfile?.business?.longitude ?? null
	};
	const hasLocation = location.longitude !== null && location.latitude !== null;
	if(!hasLocation){
		// handle?
		return NextResponse.json({ error: "User profile has no location" }, { status: 500 });
	}
	const premium = userProfile?.profile?.premium ?? false;
	const radius = premium ? 100 : 20;
	const trade = userProfile?.business?.primaryTrade ?? null;
	if(trade === null){
		return NextResponse.json({ error: "User profile has no primary trade" }, { status: 500 });
	}
	// find users near callers location
	let near = null;
	try{	
		// need location, userId, primaryTrade
		near = await userRepo.getUsersNear(location, claims.id);
	}catch(err_){
		return NextResponse.json({ error: "Failed to query users near callers location" }, { status: 500 });
	}
	// refine by haversine distance
	let refined = near.filter((x)=>haversineKm(location.latitude, location.longitude, x.latitude, x.longitude)<=radius);
	// free users only match on like trades
	if(!premium){
		refined = refined.filter((x)=>x.primaryTrade === trade);
	}
	// find matching users
	let matches = null;
	try{
		const userIds = refined.map((e,i)=>e.userId);
		matches = await usersRepo.getUserProfilesById(userIds);
	}catch(err_){
		return NextResponse.json({ error: "Failed to query users" }, { status: 500 });
	}
	return NextResponse.json({ users: matches ?? [] }, { status: 200 });
}
