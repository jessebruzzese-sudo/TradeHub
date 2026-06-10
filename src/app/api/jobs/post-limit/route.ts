// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";

export const dynamic = 'force-dynamic';

const getClaims = async () => {
	const store = await cookies();
	const cookie = store.get("authorization") ?? null;
	const jwt = cookie?.value ?? null;
	return jose.decodeJwt(jwt);
};

/**
 * GET /api/jobs/post-limit — Free-tier usage for the signed-in contractor (rolling window).
 * Premium users: { unlimited: true }. Used by /jobs and /jobs/create UI only.
 */
export const GET = async (request:NextRequest) => {
	let claims = null;
	try{
		claims = await getClaims();
	}catch(err_){
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
	}
  try{
		const { jobs } = await getDataService();
		const count = await jobs.getJobCount(claims.id, 30);	
    return NextResponse.json({
      unlimited: false,
      windowDays: 30,
      maxFree: 1,
      usedInWindow: count
    }, { status: 200 });
  }catch(err_){
    console.error('[api/jobs/post-limit]', err_);
    return NextResponse.json({ error: 'Could not load post limit' }, { status: 500 });
  }
}
