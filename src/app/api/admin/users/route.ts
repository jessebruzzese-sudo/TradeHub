// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { applyExcludeTestAccountsFilters } from '@/lib/test-account';
import { loadActiveTradeNames } from '@/lib/trades/load-active-trades';
import { normalizeTrade } from '@/lib/trades/normalizeTrade';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";
import * as dateFunctions from "date-fns";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
	const claims = await getClaims();
	const role = claims.role;
	if(role?.toLowerCase() !== "admin"){
		return NextResponse.json({ msg: `Forbidden, role was ${role}` }, { status: 403 });
	}
	const { users: userRepo, trades: tradeRepo } = await getDataService();
	const DEFAULT_PAGE_SIZE = 10;
	const DEFAULT_PAGE = 0;
	const searchParams = request.nextUrl.searchParams;
	const sortBy = searchParams.get("sortBy") ?? null;
	const trade = searchParams.get("trade")?.toLowerCase() ?? "all";
	const searchTerm = searchParams.get("searchTerm")?.toLowerCase() ?? null;
	let pageSize = searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE;
	let page = searchParams.get("page") ?? DEFAULT_PAGE;
	page *= 1
	pageSize *= 1
	// validate input params
	// must be non null numbers (integers)
	if(isNaN(page) || isNaN(pageSize) || pageSize === null || page === null){
		return NextResponse.json({ msg: "Both page and page size must be integers" }, { status: 400 });
	}
	// query trades
	// find trade id for trade parameter
	let trades = null;
	let tradeId = "all";
	try{
		trades = await tradeRepo.getActiveTrades();
		if(trade !== "all"){
			const match = trades.find((x)=>x.name.toLowerCase() === trade);
			if(match === undefined){
				return NextResponse.json({ msg: `Could not find trade ${trade}` }, { status: 400 });
			}
			tradeId = match.id;
		}
		// grab trade names for ui	
		// should really using a combination of id and name
		trades = trades.map((e,i)=>{ return e.name; });
	}catch(err){
		console.error(err);
		return NextResponse.json({ msg: "Failed to query trades" }, { status: 500 });
	}
	let ids = null;
	try{
		const results = await userRepo.getUserIds(tradeId, searchTerm, sortBy);
		ids = results.rows;
	}catch(err){
		return NextResponse.json({ msg: "Failed to query user ids", error:err }, { status: 500 });
	}
	if(ids === null){
		return NextResponse.json({ msg: "User ids was null" }, { status: 500 });
	}
	// paginate
	const offset = page * pageSize;
	const total = ids.length;
	const pages = Math.ceil(total / pageSize);
	ids = ids.slice(offset, offset + pageSize);
	let users = null;
	try{
		const allIds = ids.map((e,i)=>e.id);
		users = await userRepo.getUserProfilesById(allIds);
	}catch(err){
		console.error(err);
		return NextResponse.json({ msg: "Failed to query users" }, { status: 500 });
	}
	// sort after pagination?
	// should really sort while querying all ids
	// I'll turn this off but keep the code
	const USE_PAGE_SORT = false;
	if(USE_PAGE_SORT){
		const now = new Date();
		const twoMinutesAgo = dateFunctions.subMinutes(now, 2);
		const startOfToday = dateFunctions.startOfDay(now);
		const sevenDaysAgo = dateFunctions.subDays(now, 7);
		const thirtyDaysAgo = dateFunctions.subDays(now, 30);
		const sortFunctions = {
			"newest": (l, r) => { return l.createdAt - r.createdAt; },
			"oldest": (l, r) => { return r.createdAt - l.createdAt; },
			"active": (l, r) => { return ( l.lastActiveAt - twoMinutesAgo ) - ( r.lastActiveAt - twoMinutesAgo ); },
			"never": (l, r) => { return r.lastActiveAt === null || l.lastActiveAt === null ? -1 : 1; }
		};
		users.sort(sortFunctions[sortBy]);
	}
	return NextResponse.json({ users, trades, pages, total });
}
