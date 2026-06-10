// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { cookies } from "next/headers";
import * as jose from "jose";
import * as z from "zod";

export const dynamic = 'force-dynamic';

/** POST — toggle like (insert if missing, delete if present). */
export async function POST(request: Request, context: RouteContext) {
	return NextResponse.json({ok:true}, { status: 200 });
}
