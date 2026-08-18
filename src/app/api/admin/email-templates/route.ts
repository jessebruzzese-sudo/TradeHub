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
	const { templates: templateRepo } = await getDataService();
	try{
		const templates_ = await templateRepo.getEmailTemplates();
		return NextResponse.json({ templates: templates_ }, { status: 200 });
	}catch(err){
		console.error(err);
		return NextResponse.json({ msg: "Failed to query email templates" }, { status: 500 });
	}
}
