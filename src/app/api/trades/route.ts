// vim: ts=2
import { NextResponse } from 'next/server';
import { getDataService } from "@/lib/data/service";
export const dynamic = 'force-dynamic';
/** Public catalog for trade selectors and filters. */
export async function GET() {
  try {
		const { trades } = await getDataService();
		const results = await trades.getActiveTrades();
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load trades' }, { status: 500 });
  }
}
