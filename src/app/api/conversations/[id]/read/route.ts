// vim: ts=2
// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function PUT(request: NextRequest, context:any) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
	if(claims === null){
		return NextResponse.json({ error: "Claims were null" }, { status: 500 });
	}
	const { id: conversationId }  = ( await context.params );
	try{ 
		const { conversations: convRepo, profile: profileRepo }	= await getDataService();
	 	const profileId = await profileRepo.getProfileId(claims.id);
		// mark messages sent to me as read
		// i.e. messages where senderProfileId <> profileId
		// and that aren't already read
		await convRepo.markMessagesAsRead(conversationId, profileId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Could not mark all messages as read", err: err_ }, { status: 500 });
	}
	return NextResponse.json({ ok: true }, { status: 200 });
}
