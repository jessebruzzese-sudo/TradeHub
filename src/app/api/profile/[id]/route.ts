// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getMimeForFile } from "@/lib/utils";
import { cookies } from "next/headers";
import { readFile } from "node:fs/promises";
import { ENV } from "@/lib/env";
import * as jose from "jose";
import * as z from "zod";

export async function GET(request: NextRequest, context: RouteContext) {
	let userProfile = null;
	try{
		const { id } = await context.params;
		const { users } = await getDataService();
		userProfile = await users.getUserProfile(id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	// TODO check public
	delete userProfile["password"];
	const avatar = userProfile?.profile?.avatarDataUrl ?? null;
	if(avatar !== null){
		const mime = getMimeForFile(avatar);
		const buffer = await readFile(avatar);
		userProfile.profile.avatarDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
	}
	return NextResponse.json(userProfile, { status: 200 });
}
