// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { doWelcome, doUserCreated } from "@/lib/email/service";
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
		const userId = added.userId;
		const code = added.activationCode;
		try{
			const welcome = { name, email, code, userId };
			await doWelcome(welcome);
		}catch(err_){
			console.error("Failed to send welcome email");
		}
		try{
			await doUserCreated(payload);
		}catch(err_){
			console.error("Failed to send user created email");
			console.error(err_);
		}
		return NextResponse.json({userId}, {status:201});
	}catch(err_){
		return NextResponse.json({error:"Failed to create new user"}, {status:500});
	}
}
