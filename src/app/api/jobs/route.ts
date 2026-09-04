// vim: ts=2 
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import { doJobCreated }  from "@/lib/email/service";
import { ENV } from "@/lib/env";
export const dynamic = 'force-dynamic';
import * as z from "zod";
import * as jose from "jose";
import * as df from "date-fns";

const AttachmentSchema = z.object({
	fileName: z.string(),
	data: z.string(),
	mime: z.string()
});

const CreateJobSchema = z.object({
	title: z.string(),
	description: z.string(),
	tradeCategory: z.string(),
	location: z.string(),
	postcode: z.string(),
	placeId: z.string().nullable(),
	longitude: z.number(),
	latitude: z.number(),
	dates: z.array(z.string()),	
	startTime: z.string(),	
	durationDays: z.number().int(),
	payType: z.string(),
	rate: z.number().nullable(),
	attachments: z.array(AttachmentSchema)
});

/**
 * POST /api/jobs — Create a job with server-side trade validation.
 * - Free users: trade_category must be one of their listed trades.
 * - Premium users: trade_category may be any valid TradeHub trade.
 */
export async function POST(request: NextRequest) {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	let claims = null;
	try{
		claims = await jose.decodeJwt(jwt);
	}catch(err_){
		return NextResponse.json(
			{ error: "Not authorized" },
			{ status: 401 }
		);
	}
	// grab profile
	let user_ = null;
	const { users, jobs } = await getDataService();
	try{
		user_ = await users.getUserProfile(claims.id);
	}catch(err_){
		return NextResponse.json(
			{ error: "Failed to query user profile" },
			{ status: 500 }
		);
	}
	if(user_ === null){
		return NextResponse.json(
			{ error: "Failed to find user profile (null)" },
			{ status: 500 }
		);
	}
	// parse payload
	// validate with zod
	let payload = null;
	try{
		payload = CreateJobSchema.parse(await request.json());
	}catch(err_){
		console.error(err_);
		return NextResponse.json(
			{ error: "Failed to parse payload" },
			{ status: 400 }
		);
	}
	// toggle validations off during testing
	const DO_VALIDATIONS = true;
	// check premium status
	// premium accounts aren't limited to a trade
	// free accounts are
	const isPremium = user_.profile.premium;
	if (!isPremium && DO_VALIDATIONS) {
		const userTrades = user_.business.trades;
		const primaryTrade = user_?.business?.primaryTrade?.toLowerCase() ?? null;
		if(primaryTrade === null){
			return NextResponse.json(
				{ error: "Primary trade was null" },
				{ status: 500 }
			);
		}
		const resolvedCategory = payload?.tradeCategory?.toLowerCase() ?? null;
		if(resolvedCategory === null){
			return NextResponse.json(
				{ error: "Submitted category was null" },
				{ status: 500 }
			);
		}
		if (primaryTrade !== resolvedCategory) {
			return NextResponse.json(
				{ error: 'Free accounts can only post jobs in their listed trade(s). Upgrade to Premium to post in any trade.' },
				{ status: 403 }
			);
		}
		try {
			// enforce free job count
			// free users are allowed to post one job
			// per month
			const WINDOW_LENGTH = 30;
			const n = await jobs.getJobCount(claims.id, 30);
			if(n > 0){
				return NextResponse.json(
					{ error: "Too many jobs created, please try again later." },
					{ status: 403 }
				);
			}
		} catch (err_) {
			console.error(err_);
			return NextResponse.json(
				{ error: "Failed to query job count", exception: err_ },
				{ status: 500 }
			);
		}
	}
	// set profileId, create job
	let newId = null;
	payload.profileId = user_.profileId;
	try{		
		newId = await jobs.addJob(payload);	
	}catch(err_){
		console.error(err_);
		return NextResponse.json(
			{ error: "Failed to create new job record" },
			{ status: 500 }
		);
	}
	// alert admins about new job
	// swallow exceptions
	try{
		const name = user_.visibleName ?? user_.name;
		const createdAt = df.format(new Date(), "MMM d yyyy, 'at' hh:mm a");
		const jobUrl = `${ENV.sendgrid.appBaseUrl}/admin/jobs/${newId}`;
		await doJobCreated({jobId: newId, createdAt, name, jobUrl });
	}catch(err_){
		console.error(err_);
	}
	return NextResponse.json({ id: newId });
}
