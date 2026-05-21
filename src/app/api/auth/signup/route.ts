// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
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
	console.log(JSON.stringify(payload));
	const { users } = await getDataService();
	const addedId: string = await users.addBusinessUser(payload);
	return NextResponse.json({userId:addedId}, {status:201});
}
