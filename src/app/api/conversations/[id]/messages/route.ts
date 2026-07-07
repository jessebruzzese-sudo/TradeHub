// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import { doMessageSent } from "@/lib/email/service";
import * as z from "zod";

export async function POST(request: NextRequest, context:any) {
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
		conversation = await convoRepo.getConversation(conversationId);
		if(conversation === null){
			return NextResponse.json({ error: `Failed to find conversation (null) ${conversationId}`}, { status: 404 });
		}
		const okOwnership = conversation.ownerUserId === userId || conversation.guestUserId === userId;
		if(!okOwnership){
			return NextResponse.json({ error: `Conversation ${conversationId} is not owned by user ${userId}`}, { status: 403 });
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query conversation"}, { status: 500 });
	}
	// parse payload
	const schema = z.object({
		message: z.string(),	
		senderProfileId: z.uuid()
	});
	let payload = null;
	try{
		payload = schema.parse(await request.json());
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to parse payload", zod: err_ }, { status: 400 });
	}
	let msgId = null;
	let createdAt = null;
	try{
		const { conversations: convRepo } = await getDataService();
		const results = await convRepo.addMessage({...payload, conversationId });
		msgId = results[0]?.id ?? null;
		createdAt = results[0]?.createdAt ?? null;
		if(msgId === null || createdAt === null){
			return NextResponse.json({ error: "Error creating message, id was null" }, { status: 500 });
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to parse payload", zod: err_ }, { status: 500 });
	}
	// figure out who is sender and who is recipient
	let senderName = null;
	let recipient = null;
	if(payload.senderProfileId === conversation.ownerProfileId){
		senderName = conversation.ownerName;
		recipient = conversation.guestEmail;
	}else{
		recipient = conversation.ownerEmail;
		senderName = conversation.guestName;
	}
	try{	
		const baseUrl = "https://www.tradehub.com.au/login?returnTo=";
		const event = {
			senderName: senderName,
    	timestamp: createdAt.toISOString(),
    	conversationUrl: `${baseUrl}/messages?conversationId=${conversationId}`,
    	unsubscribeUrl: `${baseUrl}/dashboard`,
    	notificationUrl: `${baseUrl}/dashboard`
		};
		await doMessageSent(event, recipient);
	}catch(err_){
		console.error(err_);
		// log but ignore error
		// dont want email notifications causing crashes
	}
	return NextResponse.json({ msgId }, { status: 201 });
}

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
		conversation = await convoRepo.getConversation(conversationId);
		if(conversation === null){
			return NextResponse.json({ error: `Failed to find conversation (null) ${conversationId}`}, { status: 404 });
		}
		const okOwnership = conversation.ownerUserId === userId || conversation.guestUserId === userId;
		if(!okOwnership){
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
