// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as jose from "jose";
import * as z from "zod";

export async function DELETE(request: NextRequest, context:any) {
	const claims = await getClaims();
	const { id: workId } = await context.params;
	const { profile, works } = await getDataService();
	const profileId = await profile.getProfileId(claims.id);
	const isAdmin = claims.role === "admin";
	let workItem = null;
	try{
		workItem = await works.getWorkById(workId);	
	}catch(err_){
		return NextResponse.json({error:`Error retrieving work ${workId}`}, {status: 500});
	}
	console.log(JSON.stringify(workItem));
	if(workItem === null){
		return NextResponse.json({error:`Work item ${workId} doesn't exist`}, {status: 404});
	}
	const canDelete = isAdmin || ( !isAdmin && workItem.profileId === profileId );
	if(!canDelete){
		return NextResponse.json({error:`Forbidden, cannot delete this work item`}, {status: 403});
	}
	const DRY = false;
	if(DRY){
		return NextResponse.json({workItem, canDelete}, {status: 200});
	}
	try{
		await works.deleteWork(workId);
		return NextResponse.json({ok:true}, {status: 200});
	}catch(err_){
		return NextResponse.json({error:"Failed to delete work"}, {status: 500});
	}
}
