// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { applyExcludeTestAccountsFilters } from '@/lib/test-account';
import { loadActiveTradeNames } from '@/lib/trades/load-active-trades';
import { normalizeTrade } from '@/lib/trades/normalizeTrade';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";
import { sendEmail } from "@/lib/email/service";
import * as dateFunctions from "date-fns";
import * as z from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SendEmailsPayload = z.object({
	allUsers: z.boolean(),
	userIds: z.array(z.uuid())
});

export async function POST(request: NextRequest, context:any) {
	const claims = await getClaims();
	const role = claims.role;
	if(role?.toLowerCase() !== "admin"){
		return NextResponse.json({ msg: `Forbidden, role was ${role}` }, { status: 403 });
	}
	const { users: userRepo, templates: templateRepo } = await getDataService();
	const { id: templateId } = await context.params;
	try{
		// make sure that template exists
		const templates_ = await templateRepo.getEmailTemplates();
		const match = templates_.find((x)=>x === templateId);
		if(!match){
			return NextResponse.json({ msg: `The template ${templateId} doesn't exist` }, { status: 400 });
		}
		const payload = SendEmailsPayload.parse(await request.json());
		if(payload.allUsers){
			return NextResponse.json({ msg: `Not supporting all users yet` }, { status: 400 });
		}
		// grab profiles that are being sent
		const users_ = await userRepo.getUserProfilesById(payload.userIds);	
		let sent = 0;
		let failed = 0;
		for(const user__ of users_){
			try{
				// try to send each one
				// dont let a failure stop
				await sendEmail(templateId, user__);
				sent += 1;
			}catch(err__){
				failed += 1;
				console.error(err__);
				continue;
			}
		}
		return NextResponse.json({ ok: true, sent, msg: `Sent ${sent} email(s)`, failed }, { status: 200 });
	}catch(err){
		console.error(err);
		return NextResponse.json({ msg: "Failed to send emails" }, { status: 500 });
	}
}
