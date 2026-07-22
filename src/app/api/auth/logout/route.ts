// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
import { ENV } from "@/lib/env";
import bcrypt from "bcrypt";
import * as jose from "jose";

export async function PUT(req: Request) {
	// delete authorization cookie
	const response_ = NextResponse.json({ ok: true }, { status: 200 });
	response_.cookies.delete("authorization");
	return response_;
}
