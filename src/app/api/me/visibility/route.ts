// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

const ChangeVisibilitySchema = z.object({
	public: z.boolean()
});

export async function PUT(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	let payload = null;
	try{
		payload = ChangeVisibilitySchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({msg:"Invalid payload"}, { status: 400 });
	}
	try{
		const { users } = await getDataService();
		await users.setVisibility(email, payload.public);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	return NextResponse.json({msg:"OK"}, { status: 200});
}
