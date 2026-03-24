import { NextResponse } from 'next/server';
import { fetchProfileStrengthCalc } from '@/lib/profile-strength-server';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** GET — public breakdown for profile strength (no PII). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = id?.trim();
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }
  const calc = await fetchProfileStrengthCalc(userId);
  if (!calc) {
    return NextResponse.json({ error: 'Could not compute strength' }, { status: 500 });
  }
  return NextResponse.json(calc);
}
