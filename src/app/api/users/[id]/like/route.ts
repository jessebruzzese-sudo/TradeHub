// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

type LikeStateType = {
	liked: boolean;
	likesCount: number;
};

export async function PUT(request: NextRequest, context: any) {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
		return NextResponse.json({ error: "Failed to get claims" }, { status: 500 });
	}
	if(claims === null){
		return NextResponse.json({ error: "Claims were null" }, { status: 500 });
	}
	const viewerId = claims.id; // user id of person that is logged in
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
	let likeState: LikeStateType = null;
	try{
		likeState = await profileRepo.toggleLike(viewerId, profileId);
	}catch(err_){
		return NextResponse.json({ error: "Failed to process like"}, { status: 200 });
	}
	return NextResponse.json(likeState, { status: 200 });
}
