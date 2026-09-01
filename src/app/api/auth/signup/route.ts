// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { doWelcome, doUserCreated } from "@/lib/email/service";
import { sendSMS } from "@/lib/sms/service";
import { ENV } from "@/lib/env";
import * as z from "zod";

export type BusinessPayload = {
	primaryTrade: string;
	businessName: string;
	abn: string;	
	abnEntityName: string;
	abnEntityType: string;
	abnVerified: boolean;
	location: string;
	postcode: string;
	locationLat: string;
	locationLong: string;
	availability: any|null;
	tradeCategories: any;
	trades: any;
};
export type SignUpPayload = {
	name: string;
	visibleName: string;
	email: string;
	mobile: string;
	password: string;
	business: BusinessPayload;
};
export async function POST(req: Request) {
	const payload = (await req.json()) as SignUpPayload;
	const { users } = await getDataService();
	const EmailSchema = z.object({
		email: z.email()
	});
	try{
		EmailSchema.parse({email: payload.email});
	}catch(err_){
		return NextResponse.json({error:"Invalid payload, email is not valid."}, {status:400});
	}
	let existing = false;
	try{
		const matches = await users.getUserIdsForEmail(payload.email);
		existing = matches.length > 0;
	}catch(err_){
		return NextResponse.json({error:"Failed to check for existing emails"}, {status:500});
	}
	if(existing){
		return NextResponse.json({error:"Email already exists"}, {status:400});
	}
	try{
		// TODO check for existing emails
		const added: any = await users.addBusinessUser(payload);
		const name = payload.name;
		const email = payload.email;
		const mobile = payload.mobile;
		const userId = added.userId;
		const code = added.activationCode;
		const mobileCode = added.mobileCode;
		try{
			// always send welcome email
			const welcome = { name, email, code, userId };
			await doWelcome(welcome);
		}catch(err_){
			console.error("Failed to send welcome email");
		}
		try{
			// send mobile activation sms
			const link = "https://www.tradehub.com.au/activate";
			const body = `Welcome to TradeHub your activation code is ${mobileCode}. Please visit ${link} to activate.`;
			let to = mobile;
			// validate this from frontend
			if(to.charAt(0) !== "0"){
				throw new Error("First digit was not zero");
			}		
			// replace first zero with international code for Australia
			to = to.replace("0", "+61");
			const msg = await sendSMS(to, body);
			console.log(msg);
		}catch(err_){	
			console.error(err_);
			console.error("Failed to send welcome sms");
		}
		// send alert for user created if desired
		if(ENV.sendgrid.alerts.userCreated){
			try{
				await doUserCreated(payload);
			}catch(err_){
				console.error("Failed to send user created email");
				console.error(err_);
			}
		}
		return NextResponse.json({userId}, {status:201});
	}catch(err_){
		return NextResponse.json({error:"Failed to create new user"}, {status:500});
	}
}
