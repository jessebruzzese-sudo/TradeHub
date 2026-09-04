// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { getClaims } from "@/lib/claims/service";
import { doAvailabilityUpdated } from "@/lib/email/service";
import { ENV } from "@/lib/env";
import * as z from "zod";
import * as df from "date-fns";

const PricingSchema = z.object({
	priceType: z.string().nullable(),
	price: z.number().nullable(),
	showPricing: z.boolean()
});

const AvailabilitySchema = z.object({
	dates: z.string().array(),
	description: z.string(),
	pricing: PricingSchema
});

export async function GET(request: NextRequest) {
	const { id: userId } = await getClaims();
	let result = null;
	try{
		const { availability } = await getDataService();
		result = await availability.getAvailability(userId);
	}catch(err_){
		return NextResponse.json({msg:"Failed to create availability record"}, {status:500});
	}
	return NextResponse.json(result, {status: 200});
}

export async function POST(request: NextRequest) {
	const { id: userId } = await getClaims();
	let payload = null;
	try{
		payload = AvailabilitySchema.parse(await request.json());
	}catch(err_){
		return NextResponse.json({msg:"Invalid payload"}, {status:400});
	}
	let user_ = null;
	try{
		const { availability, users: userRepo } = await getDataService();
		user_ = await userRepo.getUserProfile(userId);
		if(user_ === null){
			return NextResponse.json({msg:"Failed to query user profile"}, {status:500});
		}
		const businessId = user_?.business?.id ?? null;
		if(businessId === null){
			return NextResponse.json({msg:"No business is linked with user"}, {status:500});
		}
		await availability.addAvailability(payload, userId, businessId);
	}catch(err_){
		return NextResponse.json({msg:"Failed to create availability record"}, {status:500});
	}
	try{
		const adminUrl = `${ENV.sendgrid.appBaseUrl}/admin/users/${userId}`;
		const updatedAt = df.format(new Date(), "MMM d yyyy, 'at' hh:mm a z");
		const name = user_?.visibleName ?? user_.name;
		const data = { adminUrl, updatedAt, name };
		await doAvailabilityUpdated(data);	
	}catch(err_){
		console.error(err_);
	}
	return NextResponse.json({msg:"OK"}, {status: 200});
}
