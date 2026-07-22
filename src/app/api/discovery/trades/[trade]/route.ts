// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import { haversineKm } from "@/lib/discovery";
import { parse, format } from "date-fns";

export async function GET(request: NextRequest, context) {
	// debugging hooks
	// not for production
	const queryParams = request.nextUrl.searchParams;
	let HOOK_NEAR_USERS = ( queryParams.get("hookNearUsers") ?? "false" ) === "true";
	let HOOK_USER_LOCATION = ( queryParams.get("hookUserLocation") ?? "false" ) === "true";
	let HOOK_HAVERSINE = ( queryParams.get("hookHaversine") ?? "false" ) === "true";
	let HOOK_MATCHES = ( queryParams.get("hookMatches") ?? "false" ) === "true";
	const sortBy = queryParams.get("sortBy") ?? null;
	const abnVerifiedOnly = queryParams.get("abnVerifiedOnly") ?? null;
	const includeAvailableOnly = queryParams.get("includeAvailableOnly") ?? null;
	const filterDates = queryParams.get("filterDates") ?? null;
	const nameQuery = queryParams.get("nameQuery") ?? null;
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
	const { users: userRepo, trades: tradeRepo, availability: availRepo } = await getDataService();
	const tradeMapping = await tradeRepo.getMapping(true);
	const lcTradeMapping = {};
	for(const name of Object.keys(tradeMapping)){
		lcTradeMapping[name.toLowerCase()] = tradeMapping[name];
	}	
	// grab trade id from the trade name
	// be wary of "all" (premium accounts)
	const ALL_TRADES = "all";
	const trade = (await context.params)?.trade?.toLowerCase() ?? null;
	const tradeId = lcTradeMapping[trade?.toLowerCase()] ?? null;
	if(tradeId === null && trade !== ALL_TRADES){
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
	refined = refined.filter((x) => x.trades.find((j) => j === trade || trade === ALL_TRADES) !== undefined);
	// find matching users
	let matches = null;
	let userDistanceMapping = null;
	try{
		userDistanceMapping = refined.reduce((a, c)=>{
			const key = c.userId;
			const value = c.distance;
			a[key] = value;
			return a;
		}, {});
		if(HOOK_MATCHES){
			return NextResponse.json({ userIds, count: userIds.length }, { status: 200 });
		}
		matches = await userRepo.getUserProfilesById(Object.keys(userDistanceMapping));
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query users" }, { status: 500 });
	}
	// apply filtering by name
	if(nameQuery !== null){
		const tokens = nameQuery.split(" ").map((e,i)=>{return e.trim().toLowerCase(); });
		// check that any name of any matched user
		// contains any sub string of the search input
		const predicate = (user) => {
			const name = user?.name?.toLowerCase() ?? null;
			const visible = user?.visibleName?.toLowerCase() ?? null;
			const businessName = user?.business?.businessName ?? null;
			const abnName = user?.business?.abnEntityName ?? null;
			const names = [];
			if(name) names.push(name);
			if(visible) names.push(visible);
			if(businessName) names.push(businessName);
			if(abnName) names.push(abnName);
			return names.reduce((a, c)=>{
				if(a === true){
					return a;
				}	
				let found = false;
				for(const t of tokens){
					if(c.indexOf(t) !== -1){
						found = true;
						break;
					}
				}
				return a || found;
			}, false);
		};
		matches = matches.filter(predicate);
	}
	// apply filtering by verification status
	// filter by onlyn accepts two parameters
	// one being "all" and another being abn-verified
	// all is irrelevant as its just all results
	// only need to filter by abn verified
	if(abnVerifiedOnly !== null && abnVerifiedOnly === "true"){
		matches = matches.filter((user)=>user.business.abnVerified);
	}
	// apply availability to remaining profiles
	const businessIds = matches.map((user,i)=>user.business.id);
	const availMap = await availRepo.getAvailabilityForBusinessIds(businessIds);
	matches = matches.map((user,i)=>{
		return {
			...user, 
			availability: availMap[user.business.id] ?? []
		};	
	});
	// filter by upcoming availability
	// if a profile has anything marked as available in the future
	// this profile is returned
	if(includeAvailableOnly !== null && includeAvailableOnly === "true"){
		const now = new Date();
		matches = matches.filter((user)=>{
			const future = user.availability.filter((x)=>x >= now);
			return future.length > 0;
		});
	}
	// check for specific dates
	if(filterDates !== null && filterDates !== ""){
		const selectedDates = filterDates.split(",").map((e,i)=>{ return e.trim(); });
		const mappedDates = selectedDates.reduce((a, c)=>{ a[c] = 1; return a; }, {});
		matches = matches.filter((user)=>{
			const dates = user.availability.map((e,i)=>{ return format(e, "yyyy-MM-dd"); });
			for(const d of dates){
				if(mappedDates[d] !== undefined){
					return true;
				}
			}
			return false;
		});
	}
	for(const m of matches){
		const userId = m.id;
		const distance = userDistanceMapping[userId] ?? null;
		if(distance === null){
			console.error(`Distance for user ${userId} was not defined`);
			continue;
		}
		m.distance = distance;
	}
	// apply sorting
	const DEFAULT_PRICE = 1000000;
	const DEFAULT_RATING = 100;
	const sortingMethods = {
		"distance-closest": (l, r) => l.distance - r.distance,
		"distance-furthest": (l, r) => r.distance - l.distance,
		"price-lowest": (l, r) => ( l?.business?.price ?? DEFAULT_PRICE ) - ( r.business.price ?? DEFAULT_PRICE ),
		"price-highest": (l, r) => ( r?.business?.price ?? DEFAULT_PRICE ) - ( l?.business?.price ?? DEFAULT_PRICE ),
		"rating-lowest": (l, r) => ( l?.profile?.rating ?? DEFAULT_RATING ) - ( r?.profile?.rating ?? DEFAULT_RATING ),
		"rating-highest": (l, r) => ( r?.profile?.rating ?? DEFAULT_RATING ) - ( l?.profile?.rating ?? DEFAULT_RATING )
	};
	console.log(`Sorting method is ${sortBy}`);
	const appliedSort = sortingMethods[sortBy] ?? null;
	if(appliedSort !== null){
		console.log(`Applying sort ${sortBy}`);
		matches.sort(appliedSort);	
	}
	return NextResponse.json({ matches: matches ?? [] }, { status: 200 });
}
