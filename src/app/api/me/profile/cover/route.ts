// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
const { readFile, writeFile } = require("node:fs/promises");
const { Buffer } = require("node:buffer");
import { ENV } from "@/lib/env";
import * as z from "zod";

const ProfileCoverPayload = z.object({
	data: z.string(),	
	mime: z.string()
});

export async function PUT(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	let payload = null;
	// parse image payload
	try{
		payload = ProfileCoverPayload.parse(await request.json());
	}catch(err_){
		return NextResponse.json({msg:"Failed to parse payload", err:err_}, { status: 400 });
	}
	// write image to store
	let filePath = null;
	try{
		const dir = ENV.store.images;
		const file = crypto.randomUUID();
		const extension = payload.mime === "image/png" ? "png" : null;
		if(extension === null){
			throw new Error(`Failed to determine extension from mime type ${payload.mime}`);
		}
		filePath = `${dir}/${file}.${extension}`;
		console.log(`Writing image to ${filePath}`);
		await writeFile(filePath, Buffer.from(payload.data, "base64"));
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to write image", err:err_}, { status: 500 });
	}
	try{
		const { profile } = await getDataService();
		const profileId = await profile.getProfileId(email);
		await profile.setProfileCover(profileId, filePath);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to update profile cover"}, { status: 500 });
	}
	return NextResponse.json({success:true}, { status: 200 });
}

export async function GET(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	const claims = await jose.decodeJwt(jwt);
	const email = claims.email;
	let images = null;
	try{
		const { profile } = await getDataService();
		const profileId = await profile.getProfileId(email);
		if(profileId === null){
			throw new Error("Could not determine profile id (null)");
		}
		images = await profile.getProfileImages(profileId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	const filePath = images.cover;
	if(filePath === null){
		return NextResponse.json({data: null, mime:null}, { status: 200 });
	}
	let data = null;
	try{
		data = await readFile(filePath);
	}catch(err_){
		return NextResponse.json({msg:"Failed to read cover file image"}, { status: 500 });
	}
	return NextResponse.json({data: Buffer.from(data).toString("base64"), mime:"image/png"}, { status: 200 });
}
