// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import * as z from "zod";

const ActivationPayload = z.object({
	userId: z.string().uuid(),
	code: z.string()
});

export async function GET(request: NextRequest) {
	const query = request.nextUrl.searchParams;
	const userId = query.get("uid") ?? null;
	const code = query.get("code") ?? null;
	// check for mobile activation code
	// different from email activation code
	const mobileCode = query.get("activationCode") ?? null;
	if(mobileCode !== null){
		const { users: userRepo } = await getDataService();
		try{
			await userRepo.activateUserMobile(mobileCode);
			return NextResponse.json({ ok: true }, { status: 200 });
		}catch(err_){
			console.error(err_);
			console.error("Failed to activate via mobile code");
			return NextResponse.json({ 
				error: "Failed to activate user"
			}, { status: 500 });
		}
	}
	// normal email activation
	const payload = { code, userId };
	try{
		ActivationPayload.parse(payload);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ 
			error: "Failed to validate payload" 
		}, { status: 400 });
	}
	try{
		const { users: userRepo } = await getDataService();
		await userRepo.activateUser(payload);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ 
			error: "Failed to activate user"
		}, { status: 500 });
	}
	return NextResponse.json({ ok: true }, { status: 200 });
}
