// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";

export async function GET(request: NextRequest, context) {
	const { id: userId } = await context.params;
	let claims = null;
	try{	
		claims = await getClaims();
	}catch(err_){
		console.error(`GET\tpublic-profile\t${err_}`);
		return NextResponse.json({msg:"Not authorized"}, { status: 401 });
	}
	const { users: usersRepo } = await getDataService();
	let userProfile = null;
	try{
		userProfile = await usersRepo.getUserProfile(userId);
	}catch(err_){
		return NextResponse.json({msg:"Failed to retrieve profile"}, { status: 500 });
	}
	if(userProfile === null){
		return NextResponse.json({msg:"Not found, user profile doesn't exist"}, { status: 404 });
	}
	const isPublic = userProfile?.public ?? false;
	if(!isPublic){
		return NextResponse.json({msg:"Forbidden, users profile is not public"}, { status: 403 });
	}
	// probably shouldn't be sending this out
	// even though its hashed
	delete userProfile["password"];
	const result = {
		user: userProfile,
		viewer: {
			userId: claims.id,
			role: claims.role
		}
	};
	return NextResponse.json(result, { status: 200 });
}
