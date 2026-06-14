// vim: ts=2
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	return NextResponse.json({ ok: true }, { status: 200 });
}
