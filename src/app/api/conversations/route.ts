// vim: ts=2
// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as z from "zod";

export const dynamic = 'force-dynamic';

const ConversationSchema = z.object({
	otherProfileId: z.uuid()
});

/**
 * POST /api/conversations
 * Body: { otherProfileId }
 * Creates the direct conversation for (currentUser, otherUserId) if it doesn't exist.
 */
export async function POST(request: NextRequest) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
	if(claims === null){
		return NextResponse.json({ error: "Claims were null" }, { status: 500 });
	}
	// parse payload
	let payload = null;
	try{
		payload = ConversationSchema.parse(await request.json());
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}
	// grab my profile id
	// claims.id is not profile id its user id
	let profileId = null;
	try{
		const { profile: profileRepo }	= await getDataService();
		profileId = await profileRepo.getProfileId(claims.id);
		if(profileId === null){
			return NextResponse.json({ error: "Could not determine profile id for user" }, { status: 500 });
		}
	}catch(err_){
		return NextResponse.json({ error: "Could not determine profile id for user" }, { status: 500 });
	}
	// find existing conversation
	// or create it, same transaction
	let convoId = null;
	try{
		const { conversations: convRepo }	= await getDataService();
		convoId = await convRepo.upsertConversation(profileId, payload.otherProfileId);
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Could not add conversation", err: err_ }, { status: 500 });
	}
	return NextResponse.json({ conversationId: convoId }, { status: 200 });
}

/**
 * GET /api/conversations
 * Returns all conversations for the current user with participant info and last message.
 */
export async function GET(request:NextRequest) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
	if(claims === null){
		return NextResponse.json({ error: "Claims were null" }, { status: 500 });
	}
	let conversations = null;
	try{
		const { conversations: convRepo, profile: profileRepo } = await getDataService();
		const owner = await convRepo.getConversations(claims.id, true);
		const guest = await convRepo.getConversations(claims.id, false);
		conversations = [...owner, ...guest];
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
	}
	if(conversations === null){
		return NextResponse.json({ error: "Conversations array was null after loading" }, { status: 500 });
	}
	return NextResponse.json(conversations, { status: 200 });
}
