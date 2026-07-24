// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getMimeForFile } from "@/lib/utils";
import { cookies } from "next/headers";
import { readFile } from "node:fs/promises";
import { ENV } from "@/lib/env";
import * as jose from "jose";
import * as z from "zod";

export async function PUT(request: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const { profile: profileRepo } = await getDataService();
	const payload = await request.json();
	const schema = z.object({premium: z.boolean()});
	try{
		schema.parse(payload);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg: "Failed to parse payload", error: err_}, { status: 400 });
	}
	try{
		await profileRepo.setProfilePremium(id, payload.premium);
		return NextResponse.json({msg: "Profile updated" }, { status: 200 });
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg: "Failed to query user profile"}, { status: 500 });
	}
}
