import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { doForgotPassword } from "@/lib/email/service";
import * as crypto from "crypto";
import * as z from "zod";

const ForgotPasswordSchema = z.object({
	email: z.email()
});

export async function POST(request: Request) {
	let payload = null;
	try{
		payload = ForgotPasswordSchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({ error:"Invalid email"}, { status: 400 });
	}
	if(payload === null){
		return NextResponse.json({ error:"Payload parsed as null"}, { status: 500 });
	}
	const state = crypto.randomUUID();
	const { users: usersRepo } = await getDataService();
	try{
		await usersRepo.doForgotPassword(state, payload.email);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error:"Something went wrong, try again later."}, { status: 500 });
	}
	try{
		// send email
		await doForgotPassword(state, payload.email);	
	}catch(err_){
		console.error(err_);
	}
	return NextResponse.json({ ok: true });
}
