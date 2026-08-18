// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { applyExcludeTestAccountsFilters } from '@/lib/test-account';
import { loadActiveTradeNames } from '@/lib/trades/load-active-trades';
import { normalizeTrade } from '@/lib/trades/normalizeTrade';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";
import { sendEmail } from "@/lib/email/service";
import * as dateFunctions from "date-fns";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context:any) {
	const claims = await getClaims();
	const role = claims.role;
	if(role?.toLowerCase() !== "admin"){
		return NextResponse.json({ msg: `Forbidden, role was ${role}` }, { status: 403 });
	}
	const userId = claims.id;
	const { id: templateId } = await context.params;
	const { templates: templateRepo, users: userRepo } = await getDataService();
	try{
		// make sure that template exists
		const templates_ = await templateRepo.getEmailTemplates();
		const match = templates_.find((x)=>x === templateId);
		if(!match){
			return NextResponse.json({ msg: `The template ${templateId} doesn't exist` }, { status: 400 });
		}
		// grab user profile of this user
		// as we're only testing the email here
		const user = await userRepo.getUserProfile(userId);
		await sendEmail(templateId, user);
		return NextResponse.json({ ok: true }, { status: 200 });
	}catch(err){
		console.error(err);
		return NextResponse.json({ msg: "Failed to send test email" }, { status: 500 });
	}
}
