// vim: ts=2
import { NextResponse, NextRequest } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import { sendEmail } from "@/lib/email/service";
import { ENV } from "@/lib/env";

export async function PUT(request:NextRequest) {
	const claims = await getClaims();
	const { users } = await getDataService();
	try{
		const results = await users.getLastActive(claims.id);
		const lastActiveAt = results[0].lastActiveAt;
		const firstLogin = lastActiveAt === null;
		await users.updateLastActive(claims.id);	
		if(firstLogin && ENV.sendgrid.alerts.earlyUser){
			try{
				console.log(`Sending early user onboarding email to ${claims.id}`);
				const TEMPLATE_ID = "earlyUser";
				const userProfile = await users.getUserProfile(claims.id);
				if(!userProfile){
					console.error(`User profile was null for id ${claims.id}`);
				}
				await sendEmail(TEMPLATE_ID, userProfile);
			}catch(err__){
			}
		}
	}catch(err_){
		console.log(err_);
		return NextResponse.json({msg:"Failed to update last active", error:err_}, {status:500});
	}
  return NextResponse.json({ ok: true});
}

