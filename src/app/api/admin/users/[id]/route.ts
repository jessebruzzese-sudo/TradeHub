// vim: ts=2

import { NextResponse } from 'next/server';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";
import * as z from "zod";

export const dynamic = 'force-dynamic';

export async function GET(request:NextRequest, context:any) {
	// make sure user is admin
	const claims = await getClaims();
	const role = claims?.role?.toLowerCase() ?? "user";
	const isAdmin = role === "admin";
	if(!isAdmin){
    return NextResponse.json({ msg: "Forbidden, user is not admin." }, { status: 403 });
	}
	// grab params
	const params = await context.params;
	const userId = params.id;
	// make sure that job id is a uuid
	try{
		const payload = { id: userId };
		const schema = z.object({id: z.uuid() });
		schema.parse(payload);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to validate job id" }, { status: 400 });
	}
	const { users: userRepo } = await getDataService();
  try {
		const user = await userRepo.getUserProfile(userId);
		if(user === null){
    	return NextResponse.json({ msg: "This user doesn't exist" }, { status: 404 });
		}
		const response_ = {
			user
		};
    return NextResponse.json(response_, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ msg: "Failed to query user" }, { status: 500 });
  }
}
