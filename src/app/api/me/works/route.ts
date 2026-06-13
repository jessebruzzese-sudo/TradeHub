// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getImageExtension } from "@/lib/utils";
import { readFile } from "node:fs/promises";
import { ENV } from "@/lib/env";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

const getClaims = async () => {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	return jose.decodeJwt(jwt);
};

const WorkImageSchema = z.object({
	mime: z.string(),
	data: z.string()
});

const WorkSchema = z.object({
	caption: z.string(),
	title: z.string(),
	location: z.string(),
	images: z.array(WorkImageSchema)
});

export async function POST(request: NextRequest) {
	const claims = await getClaims();
	const { profile, works } = await getDataService();
	const profileId = await profile.getProfileId(claims.id);
	let work = null;
	try{
		work = WorkSchema.parse(await request.json());
	}catch(err_){
		console.error(err_);
		return NextResponse.json({message:"Invalid payload", err:err_}, {status: 400});
	}
	try{
		const workId = await works.addWork({...work, profileId});
		return NextResponse.json({id:workId}, {status: 200});
	}catch(err_){
		console.error(err_);
		return NextResponse.json({message:"Failed to create new work record", err:err_}, {status: 500});
	}
}

export const loadWorkImages = async (work:any) => {
	return new Promise(async(resolve, reject)=>{
		const mapping = {};
		for(const i of work.images){
			const ext = getImageExtension(i.mime);
			const file = `${i.id}.${ext}`;
			const filePath = `${ENV.store.images}/${file}`;
			const buffer = await readFile(filePath);
			const url = `data:${i.mime};base64,${buffer.toString('base64')}`;
			mapping[i.id] = url;
		}
		resolve(mapping);
	});
};


export async function GET(request: NextRequest) {
	const claims = await getClaims();
	const { profile, works } = await getDataService();
	const profileId = await profile.getProfileId(claims.id);
	const results = await works.getWork(profileId);
	// TODO think about lazing loading images
	// or better, use something like redis for caching...
	for(const w of results){
		const mapping = await loadWorkImages(w);
		for(const i of w.images){
			i.url = mapping[i.id];
		}
	}
	return NextResponse.json(results, {status: 200});
}
