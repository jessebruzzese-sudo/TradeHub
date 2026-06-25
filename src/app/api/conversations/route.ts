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
 * Creates the direct conversation for (currentUser, otherUserId) if it doesn't exist
 * The reciprocal conversation is also created (otherUserId, currentUserId).
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
	const query = request.nextUrl.searchParams;
	const HOOK_WITHOUT_PROFILES = ( query.get("hookWithoutProfiles") ?? "false" ) === "true";
	const HOOK_CHECK_PROFILES = ( query.get("hookCheckProfiles") ?? "false" ) === "true";
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
		conversations = await convRepo.getConversations(claims.id);
		if(HOOK_WITHOUT_PROFILES){
			return NextResponse.json(conversations, { status: 200 });
		}
		// determine what other profiles need to load
		// using object to enforce uniqueness
		let otherProfiles = {};
		for(const c of conversations) {
			otherProfiles[c.guestProfileId] = 1;
		}
		// load other profiles
		// only getting minimal data
		otherProfiles = Object.keys(otherProfiles);	
		const profileKeys = otherProfiles.join(", ");
		otherProfiles = await profileRepo.getConversationProfiles(otherProfiles);
		if(HOOK_CHECK_PROFILES){
			return NextResponse.json({profiles:otherProfiles, keys:profileKeys}, { status: 200 });
		}
		for(const c of conversations){
			const other = otherProfiles[c.guestProfileId] ?? null;
			if(!other){
				throw new Error(`Could not find profile for guest ${c.guestProfileId}`);
			}
			c.guestName = other.name;
			c.guestUserId = other.userId;
		}
	}catch(err_){
		console.error(err_);
		return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
	}
	return NextResponse.json(conversations, { status: 200 });
}
