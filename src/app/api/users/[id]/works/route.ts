// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { loadWorkImages } from "@/lib/images/service";

export async function GET(request: NextRequest, context:any) {
	const userId = (await context.params).id;
	const { profile: profileRepo, works: worksRepo } = await getDataService();
	let profileId = null;
	try{
		profileId = await profileRepo.getProfileId(userId);
	}catch(err_){
		return NextResponse.json({msg:"Failed to fetch profile id for user id", err:err_}, { status: 500 });
	}
	if(profileId === null){
		return NextResponse.json({msg:"Profile id is null", err:err_}, { status: 500 });
	}
	let works = null;
	try{
		works = await worksRepo.getWork(profileId);
	}catch(err_){
		return NextResponse.json({msg:"Failed to fetch works for profile", err:err_}, { status: 500 });
	}
	if(works === null){
		return NextResponse.json({msg:"Works was null", err:err_}, { status: 500 });
	}
	// load images
	// set url
	for(const w of works){
		const mapping = await loadWorkImages(w);
		for(const i of w.images){	
			const url = mapping[i.id];
			i.url = url;
		}
	}
	return NextResponse.json(works, { status: 200 });
}
