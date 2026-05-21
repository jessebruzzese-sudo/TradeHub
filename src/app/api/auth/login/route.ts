// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { ENV } from "@/lib/env";
import bcrypt from "bcrypt";
import * as jose from "jose";
type LoginPayload = {
  email: string;
	password: string;
};
export async function POST(req: Request) {
	const creds = (await req.json()) as LoginPayload;
	const { users } = await getDataService();
	let user:any|null = null
	try{
		// find user
		user = await users.getUserByEmail(creds.email);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
	}
	if(user === null){
		return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
	}
	// compare password
	const match = await bcrypt.compare(creds.password, user.password);
	if(match !== true){
		return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
	}
	// generate jwt
	const alg = "HS256";
	const secret = new TextEncoder().encode(ENV.jwt.secret);
	const claims = { email: user.email, role: user.role };
	const jwt = await new jose.SignJWT(claims).
		setProtectedHeader({alg}).
		setIssuedAt().
		setExpirationTime("2h").
		sign(secret);
	// set authorization header
	// as cookie
	const response_ = NextResponse.json({ token: jwt }, { status: 200 });
	response_.cookies.set("authorization", jwt, {httpOnly: true});
	return response_;
}
