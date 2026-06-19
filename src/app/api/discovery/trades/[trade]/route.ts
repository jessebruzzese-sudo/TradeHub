// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import { haversineKm } from "@/lib/discovery";

export async function GET(request: NextRequest, context) {
	// debugging hooks
	// not for production
	const queryParams = request.nextUrl.searchParams;
	let HOOK_NEAR_USERS = ( queryParams.get("hookNearUsers") ?? "false" ) === "true";
	let HOOK_USER_LOCATION = ( queryParams.get("hookUserLocation") ?? "false" ) === "true";
	let HOOK_HAVERSINE = ( queryParams.get("hookHaversine") ?? "false" ) === "true";
	let HOOK_MATCHES = ( queryParams.get("hookMatches") ?? "false" ) === "true";
	const sortBy = queryParams.get("sortBy");
	const filterBy = queryParams.get("filterBy");
	// make sure that hooks are false in non
	// development environments
	const DEVELOPMENT = "development";
	if(process.env.NODE_ENV !== DEVELOPMENT){
		HOOK_NEAR_USERS = false;
		HOOK_USER_LOCATION = false;
		HOOK_HAVERSINE = false;
		HOOK_MATCHES = false;
	}
	let claims = null;
	try{	
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
	const { users: userRepo, trades: tradeRepo } = await getDataService();
	const tradeMapping = await tradeRepo.getMapping(true);
	const lcTradeMapping = {};
	for(const name of Object.keys(tradeMapping)){
		lcTradeMapping[name.toLowerCase()] = tradeMapping[name];
	}
	const trade = (await context.params)?.trade?.toLowerCase() ?? null;
	const tradeId = lcTradeMapping[trade?.toLowerCase()] ?? null;
	if(tradeId === null){
		return NextResponse.json({ error: `The trade ${trade} doesn't exist` }, { status: 400 });
	}
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
		latitude: Number(userProfile?.business?.locationLat ?? 0.0),			
		longitude: Number(userProfile?.business?.locationLng ?? 0.0)
	};
	const hasLocation = location.longitude !== 0 && location.latitude !== 0;
	if(!hasLocation){
		// handle?
		return NextResponse.json({ error: "User profile has no location" }, { status: 500 });
	}
	if(HOOK_USER_LOCATION){
		return NextResponse.json({ location }, { status: 200 });
	}
	const premium = userProfile?.profile?.premium ?? false;
	const radius = premium ? 100 : 20;
	// find users near callers location
	let near = null;
	try{	
		// need location, userId, primaryTrade
		near = await userRepo.getUsersNear(location, claims.id);
	}catch(err_){
		return NextResponse.json({ error: "Failed to query users near callers location" }, { status: 500 });
	}
	if(HOOK_NEAR_USERS){
		return NextResponse.json({ near }, { status: 200 });
	}
	// refine by haversine distance
	let distances = near.map((e,i)=>{return {...e, distance: haversineKm(location.latitude, location.longitude, e.latitude, e.longitude)}});
	if(HOOK_HAVERSINE){
		return NextResponse.json({ distances }, { status: 200 });
	}
	let refined = distances.filter((x) => x.distance <= radius );
	// filter by searched trade
	refined = refined.filter((x) => x.trades.find((j) => j === trade ) !== undefined);
	// find matching users
	let matches = null;
	try{
		const userIds = refined.map((e,i)=>e.userId);
		if(HOOK_MATCHES){
			return NextResponse.json({ userIds, count: userIds.length }, { status: 200 });
		}
		matches = await userRepo.getUserProfilesById(userIds);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query users" }, { status: 500 });
	}
	return NextResponse.json({ matches: matches ?? [] }, { status: 200 });
}
