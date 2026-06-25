// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function GET(request: NextRequest, context:any) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error:"Not authorized"}, { status: 401 });
	}
	const userId = claims.id;
	const params = await context.params;
	const conversationId = params.id;
	let conversation = null;	
	try{
		const { conversations: convoRepo } = await getDataService();
		conversation = await convoRepo.getConversation(userId, conversationId);
		if(conversation === null){
			return NextResponse.json({ error: `Failed to find conversation (null) ${conversationId}`}, { status: 404 });
		}
		if(conversation.ownerUserId !== userId){
			return NextResponse.json({ error: `Conversation ${conversationId} is not owned by user ${userId}`}, { status: 403 });
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query conversation"}, { status: 500 });
	}
	let messages = null;
	try{
		const { conversations: convoRepo } = await getDataService();
		messages = await convoRepo.getMessages(conversationId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({error: "Failed to query messages for conversation"}, { status: 200 });
	}
	return NextResponse.json(messages, { status: 200 });
}
