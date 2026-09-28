// vim: ts=2
import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/oauth/service";
import { getDataService } from "@/lib/data/service";
import { randomUUID } from "crypto";
import { ENV } from "@/lib/env";
import * as bcrypt from "bcrypt";
import * as z from "zod";
import * as jose from "jose";
import * as dfs from "date-fns";

export const POST = async (request:any) => {
	const payload = await request.json();
	const schema = z.object({
		state: z.string(),
		code: z.string(),
		scope: z.string(),
		authuser: z.string()
	});
	try{
		schema.parse(payload);
	}catch(err_){
		console.error(err_);
		return;
	}
	const { google: googleRepo, users: usersRepo } = await getDataService();	
	const results = await googleRepo.findSession(payload.state);
	const id = results[0]?.id ?? null;
	if(!id){
		return NextResponse.json({msg:"Could not find session"}, {status:500});
	}
	const session = results[0];
	const DEBUG_SESSION = false;
	if(DEBUG_SESSION){
		return NextResponse.json(session, {status:200});
	}
	const client = await getOAuthClient();
	const { tokens } = await client.getToken(payload.code);
	const DEBUG_TOKENS = false;
	if(DEBUG_TOKENS){
		console.log(JSON.stringify(tokens));
	}
	client.setCredentials(tokens);
	let response_ = await client.request({url: "https://www.googleapis.com/oauth2/v2/userinfo"});
	const data = response_.data;
	const picture = data.picture; // request this later ...
	const DEBUG_USER_INFO = false;
	if(DEBUG_USER_INFO){
		console.log(JSON.stringify(data));
	}
	// set session attributes
	session.refreshToken = tokens.refresh_token;
	session.scope = tokens.scope;
	session.tokenType = tokens.token_type;
	session.sub = data.id;
	session.expiry = tokens.expiry_date;
	session.email = data.email;
	// update
	// could be useful to store token information
	// and to identify which users are using google
	await googleRepo.updateSession(session);
	// create new account using details that were obtained via google
	// don't need to validate email address google has already done that
	let createUserResponse = null;
	let existing = null;
	try{
		existing = await usersRepo.getUserIdsForEmail(data.email);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Could not determine existing user ids"}, {status:500});
	}
	if(existing === null){
		return NextResponse.json({msg:"Existing user ids was null"}, {status:500});
	}
	let userId = null;
	if(existing.length === 0){	
		try{
			const createUser = {
				email: data.email,
				name: data.name,
				visibleName: data.name,
				password: randomUUID()
			};
			createUserResponse = await usersRepo.addGoogleUser(createUser);
			userId = createUserResponse?.userId ?? null;
		}catch(err_){
			console.error(err_);
			return NextResponse.json({msg:"Failed to create new account for google registration"}, {status:500});
		}
	}else{
		userId = existing[0]?.id ?? null;
	}
	if(userId === null){
		return NextResponse.json({msg:"Failed to create new user, null user id"}, {status:500});
	}
	let userProfile = null;
	try{
		// make sure that we can query user profile
		console.log(`Querying user profile for id ${userId}`);
		userProfile = await usersRepo.getUserProfile(userId);	
		if(!userProfile){
			return NextResponse.json({msg: `User profile was null or undefined ({userProfile})`}, {status:500});
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to create new user, null user id"}, {status:500});
	}
	// create token and issue cookie
	// generate jwt, must be same as original login
  const alg = "HS256";
  const secret = new TextEncoder().encode(ENV.jwt.secret);
  const claims = { role: userProfile.role, id: userProfile.id };
  const jwt = await new jose.SignJWT(claims).
    setProtectedHeader({alg}).
    setIssuedAt().
    sign(secret);
  // set authorization header
  // as cookie
	const role = userProfile?.role?.toLowerCase() ?? null;
	const isAdmin = role === "admin";
	const redirect = isAdmin ? "/" : "/profile/edit";
 	response_ = NextResponse.json({ token: jwt, redirect }, { status: 200 });
  const now = new Date();
  const expiry = dfs.addYears(now, 1);
  response_.cookies.set("authorization", jwt, {
    httpOnly: true,
    secure: true,
    expires: expiry,
    sameSite: true
  });
  return response_;
};
