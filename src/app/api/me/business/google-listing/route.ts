// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

const GooglePlaceSchema = z.object({
	placeId: z.string().nullable(),
	mapsUrl: z.string().nullable(),
	businessName: z.string().nullable(),
	businessAddress: z.string().nullable(),
	rating: z.number().nullable(),	
	reviewCount: z.number().nullable(),
	claimed: z.boolean()
});

export async function DELETE(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	let result = null;
	const { business } = await getDataService();
	const businessId = await business.getUserBusinessId(claims.id);
	if(businessId === null){
		return NextResponse.json({msg:"Could not find this users business"}, {status:500});
	}
	try{
		await business.deleteGooglePlace(businessId);
		return NextResponse.json({ok:true}, {status:200});	
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to unlink place from business", error:err_}, 
			{status:500});
	}
}

export async function POST(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	let result = null;
	const { business } = await getDataService();
	const businessId = await business.getUserBusinessId(claims.id);
	if(businessId === null){
		return NextResponse.json({msg:"Could not find this users business"}, {status:500});
	}
	let place = null;
	try{	
		place = GooglePlaceSchema.parse(await request.json());
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to parse payload", error:err_}, {status:400});
	}
	try{
		await business.upsertGooglePlace({...place, businessId});
		return NextResponse.json({ok:true}, {status:200});	
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to link place to business", error:err_}, {status:500});
	}
}
