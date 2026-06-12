// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { readFile } from "node:fs/promises";

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
	const filePath = images.cover;
	if(filePath === null){
		return NextResponse.json({ok:false}, { status: 404 });
	}
	let data = null;
	try{
		data = await readFile(filePath);
	}catch(err_){
		return NextResponse.json({msg:"Failed to read avatar image"}, { status: 500 });
	}
	return new Response(data, {status:200, headers:{ "Content-Type": "image/png" }});
}
