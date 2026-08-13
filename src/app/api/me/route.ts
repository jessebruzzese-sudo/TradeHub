// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
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
	trades: z.array(z.string()).nullable(),
	location: z.string(),
	postcode: z.string(),
	locationLat: z.string(),
	locationLng: z.string()
});

const DeleteAccountRequest = z.object({
	password: z.string()	
});

export async function DELETE(request: NextRequest){
	const claims = await getClaims();
	// check payload
	let payload = null;
	try{
		payload = DeleteAccountRequest.parse(await request.json());
	}catch(err__){
		return NextResponse.json({msg:"Invalid payload", err:err__}, {status: 400});
	}
	// grab user id from claims
	const userId = claims.id;
	const { users: userRepo } = await getDataService();
	try{
		// compare password
		const match = await userRepo.validatePassword(userId, payload.password);
		if(!match){
			return NextResponse.json({msg: "Password doesn't match"}, {status: 401});
		}
	}catch(err_){
		console.error(err_);
		const response_ = { msg: "Failed to compare passwords", error: err_ };
		return NextResponse.json(response_, {status: 500});
	}
	try{
		// delete user
		// and everything linked to the user
		await userRepo.deleteUser(userId);
		const response_ = NextResponse.json({ok: true}, {status: 200});
		response_.cookies.delete("authorization");
		return response_;
	}catch(err_){
		console.error(err_);
		const response_ = { msg: "Failed to delete user profile", error: err_ };
		return NextResponse.json(response_, {status: 500});
	}
}

export async function PUT(request: NextRequest){
	const claims = await getClaims();
	// check payload
	let payload = null;
	try{
		payload = UpdateProfileSchema.parse(await request.json());
	}catch(err__){
		return NextResponse.json({msg:"Invalid payload", err:err__}, {status: 400});
	}
	try{
		const { users } = await getDataService();
		await users.updateUserProfile(payload, claims.id);
		return NextResponse.json({ok:true}, {status: 200});
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to update user profile", error:err_}, {status: 500});

	}
}

export async function GET(request: NextRequest) {
	const claims = await getClaims();
	let userProfile = null;
	try{
		const { users } = await getDataService();
		userProfile = await users.getUserProfile(claims.id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	delete userProfile["password"];
	return NextResponse.json(userProfile, { status: 200 });
}
