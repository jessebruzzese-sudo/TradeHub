// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

const UpdateProfileSchema = z.object({
	name: z.string(),
	phone: z.string().nullable(),
	bio: z.string().nullable(),
	miniBio: z.string().nullable(),
	website: z.string().nullable(),	
	facebook: z.string().nullable(),
	instagram: z.string().nullable(),
	linkedin: z.string().nullable(),
	youtube: z.string().nullable(),
	tiktok: z.string().nullable(),
	showPhone: z.boolean(),
	showEmail: z.boolean(),
	showAbn: z.boolean(),
	showBusinessName: z.boolean(),
	showPricing: z.boolean(),
	showListingPrice: z.boolean(),		
	price: z.number().nullable(),
	priceType: z.string().nullable(),
	primaryTrade: z.string(),
	skills: z.array(z.string()).nullable(),
	trades: z.array(z.string()).nullable()
});

export async function PUT(request: NextRequest){
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	// check payload
	let payload = null;
	try{
		payload = UpdateProfileSchema.parse(await request.json());
	}catch(err__){
		return NextResponse.json({msg:"Invalid payload", err:err__}, {status: 400});
	}
	try{
		const { users } = await getDataService();
		await users.updateUserProfile(payload, email);
		return NextResponse.json({ok:true}, {status: 200});
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to update user profile", error:err_}, {status: 500});
	}
}

export async function GET(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const userId = claims.id;
	let userProfile = null;
	try{
		const { users } = await getDataService();
		userProfile = await users.getUserProfile(userId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	delete userProfile["password"];
	return NextResponse.json(userProfile, { status: 200 });
}
