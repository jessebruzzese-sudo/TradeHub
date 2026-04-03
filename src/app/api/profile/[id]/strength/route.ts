import { NextResponse } from 'next/server';
import { fetchProfileStrengthCalc } from '@/lib/profile-strength';
import { formatUnknownError } from '@/lib/supabase/postgrest-errors';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** GET — public breakdown for profile strength (no PII). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = id?.trim();
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'Invalid user id', details: 'Expected a UUID user id' }, { status: 400 });
  }

  try {
    const calc = await fetchProfileStrengthCalc(userId);
    return NextResponse.json(calc);
  } catch (e) {
    console.error('[api/profile/strength] unhandled exception', {
      requestedUserId: userId,
      details: formatUnknownError(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to load profile strength', details: formatUnknownError(e) },
      { status: 500 }
    );
  }
}
