// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import * as z from "zod";

type RatingStateType = {
	upVotes: number;
	downVotes: number;
};

const RatingPayloadSchema = z.object({
	rating: z.number().int()
});

export async function PUT(request: NextRequest, context: any) {
	const profileUserId = ( await context.params ).id; // user id of profile that's being viewed/liked/disliked
	const { profile: profileRepo } = await getDataService();
	let profileId = null;
	// find profile that is being liked
	try{
		profileId = await profileRepo.getProfileId(profileUserId);
	}catch(err_){
		return NextResponse.json({ error: "Failed to query profile id" }, { status: 500 });
	}
	if(profileId === null){
		return NextResponse.json({ error: "Profile id was null" }, { status: 500 });
	}
	// parse payload
	let payload = null;
	try{
		payload = RatingPayloadSchema.parse(await request.json());
		const ok = payload.rating === 1 || payload.rating === -1;
		if(!ok){
			throw new Error(`Rating should either be 1 or -1 but was ${payload.rating}`);
		}
	}catch(err_){
		return NextResponse.json({ msg: "Failed to parse payload", error: err_ }, { status: 400 });
	}
	// need to return current count of upVotes and downVotes
	// for frontend to re-calculating rating
	// move calculation to backend?
	let ratingState: RatingStateType = null;
	try{
		ratingState = await profileRepo.updateRating(payload.rating, profileId);
	}catch(err_){
		return NextResponse.json({ error: "Failed to process like"}, { status: 200 });
	}
	return NextResponse.json(ratingState, { status: 200 });
}
