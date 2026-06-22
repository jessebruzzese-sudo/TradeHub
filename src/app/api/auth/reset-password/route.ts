import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { doPasswordChanged } from "@/lib/email/service";
import * as crypto from "crypto";
import * as z from "zod";

const ResetPasswordSchema = z.object({
	password: z.string(),
	state: z.uuid()
});

export async function POST(request: Request) {
	let payload = null;
	try{
		payload = ResetPasswordSchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({ error:"Invalid payload"}, { status: 400 });
	}
	if(payload === null){
		return NextResponse.json({ error:"Payload parsed as null"}, { status: 500 });
	}
	const { users: usersRepo } = await getDataService();
	let userId = null;
	let email = null;
	try{
		const results = await usersRepo.findUserWithPasswordState(payload.state);
		if(results.length === 0){
			return NextResponse.json({ error:"Invalid forgot password state"}, { status: 400 });
		}
		userId = results[0]?.id ?? null;
		email = results[0]?.email ?? null;
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error:"Something went wrong, try again later."}, { status: 500 });
	}
	// change password
	// this will clear the forgot password state
	// making the current email unable to be used again
	try{
		await usersRepo.changePassword(payload.password, userId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error:"Something went wrong, please try again later."}, { status: 500 });
	}
	const SEND_PASSWORD_CHANGED = true;
	if(SEND_PASSWORD_CHANGED){
		try{
			// send email
			await doPasswordChanged(email);	
		}catch(err_){
			console.error(err_);
		}
	}
	return NextResponse.json({ ok: true });
}
