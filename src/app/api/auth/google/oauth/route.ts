// vim: ts=2
import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/oauth/service";
import { getDataService } from "@/lib/data/service";

export const GET = async (request:any) => {
	const { google: googleRepo } = await getDataService();	
	const results = await googleRepo.getSession();
	const state = results[0]?.id ?? null;
	if(!state){
		return NextResponse.json({msg:"Could not determine session state"}, {status:500});
	}
	const DEBUG_STATE = false;
	if(DEBUG_STATE){
		return NextResponse.json({state}, {status:200});
	}
	const client = await getOAuthClient();
	const scopes = [
		"https://www.googleapis.com/auth/userinfo.email",
		"https://www.googleapis.com/auth/userinfo.profile"
	];
	const url = client.generateAuthUrl({
		state, 
		access_type: "offline", 
		include_granted_scopes: true, 
		scope: scopes 
	});
	return NextResponse.json({url}, {status:200});
};
