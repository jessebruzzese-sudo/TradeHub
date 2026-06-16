// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import { loadWorkImages } from "@/lib/images/service";

export async function GET(request: NextRequest, context: RouteContext){
	try{
  	const { id } = await context.params;
		const { works } = await getDataService();
		const work = await works.getWorkById(id);
		const mapping = await loadWorkImages(work);
		for(const i of work.images){
			const url = mapping[i.id];
			i.url = url;
		}
		return NextResponse.json(work, {status: 200});
	}catch(err_){
		console.error(err_);
		return NextResponse.json({msg:"Failed to get work", error:err_}, {status: 500});
	}
}
