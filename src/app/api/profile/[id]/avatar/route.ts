// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { readFile } from "node:fs/promises";
import { ENV } from "@/lib/env";

export async function GET(request: NextRequest, context:any) {
	const { id } = await context.params;
	let images = null;
	try{
		const { profile } = await getDataService();
		images = await profile.getProfileImages(id);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to query user profile"}, { status: 500 });
	}
	let filePath = images.avatar;
	if(filePath === null){
		const defaultImage = ENV.avatar.defaultImage;
		filePath = `${ENV.store.images}/${defaultImage}`;
	}
	let data = null;
	try{
		data = await readFile(filePath);
	}catch(err_){
		return NextResponse.json({msg:"Failed to read avatar image"}, { status: 500 });
	}
	return new Response(data, {status:200, headers:{ "Content-Type": "image/png" }});
}
