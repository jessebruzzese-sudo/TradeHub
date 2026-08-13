// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as z from "zod";

const DeleteAccountRequest = z.object({
	password: z.string()	
});

export async function POST(request: NextRequest){
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
