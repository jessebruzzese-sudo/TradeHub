// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { doWelcome } from "@/lib/email/service";
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
			console.error(err_);
		}
		return NextResponse.json({userId}, {status:201});
	}catch(err_){
		return NextResponse.json({error:"Failed to create new user"}, {status:500});
	}
}
