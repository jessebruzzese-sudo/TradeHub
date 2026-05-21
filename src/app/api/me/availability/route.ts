// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

const AvailabilitySchema = z.object({
	dates: z.string().array(),
	description: z.string()
});

export async function GET(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	let result = null;
	try{
		const { availability } = await getDataService();
		result = await availability.getAvailability(email);
	}catch(err_){
		return NextResponse.json({msg:"Failed to create availability record"}, {status:500});
	}
	return NextResponse.json(result, {status: 200});
}

export async function POST(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	let payload = null;
	try{
		payload = AvailabilitySchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({msg:"Invalid payload"}, {status:400});
	}
	try{
		const { availability } = await getDataService();
		await availability.addAvailability(payload, email);
	}catch(err_){
		return NextResponse.json({msg:"Failed to create availability record"}, {status:500});
	}
	return NextResponse.json({msg:"OK"}, {status: 200});
}
