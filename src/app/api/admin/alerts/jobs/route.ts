/**
 * GET /api/admin/alerts
 * Admin-only: Get job alerts
 */
import { NextResponse } from 'next/server';
import { getClaims } from "@/lib/claims/service";
import { getDataService } from "@/lib/data/service";

export const dynamic = 'force-dynamic';

const LIMIT = 100;

export async function GET(request:NextRequest) {
	const claims = await getClaims();
	const role = claims?.role?.toLowerCase() ?? "user";
	if(role !== "admin"){
		return NextResponse.json({ msg: "Forbidden, admin only" }, {status: 403})
	}
	const { alerts: alertRepo } = await getDataService();
  return NextResponse.json({ rows: [] });
}
