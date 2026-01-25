import { NextResponse } from 'next/server';
import { withAdmin } from '../../../../lib/admin/with-admin';

export const GET = withAdmin(async () => {
  return NextResponse.json({ ok: true });
});
