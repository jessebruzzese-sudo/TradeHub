// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import { doMessageSent } from "@/lib/email/service";
import * as z from "zod";

export async function DELETE(request: NextRequest, context:any) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error:"Not authorized"}, { status: 401 });
	}
	const userId = claims.id;
	let userProfile = null;
	try{
		const { users: usersRepo } = await getDataService();
		userProfile = await usersRepo.getUserProfile(userId);
		if(userProfile === null){
			return NextResponse.json({ msg: "User profile is null" }, { status: 500 });
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ msg: "Failed to query user profile" }, { status: 500 });
	}
	const params = await context.params;
	const conversationId = params.id;
	const messageId = params.msgId;
	let conversation = null;	
	try{
		// confirm conversation existance
		const { conversations: convoRepo } = await getDataService();
		conversation = await convoRepo.getConversation(conversationId);
		if(conversation === null){
			return NextResponse.json({ error: `Failed to find conversation (null) ${conversationId}`}, { status: 404 });
		}
		// confirm ownership
		// user obviously needs to be part of conversation
		const okOwnership = conversation.ownerUserId === userId || conversation.guestUserId === userId;
		if(!okOwnership){
			return NextResponse.json({ error: `Conversation ${conversationId} is not owned by user ${userId}`}, { status: 403 });
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to query conversation"}, { status: 500 });
	}
	let msgId = null;
	let createdAt = null;
	try{
		const { conversations: convRepo } = await getDataService();
		const deleted = await convRepo.deleteMessage(conversation.id, messageId, userProfile.profile.id);
		console.log(`Deleted ${deleted.length} message(s)`);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
	}
	return NextResponse.json({ ok: true }, { status: 200 });
}
