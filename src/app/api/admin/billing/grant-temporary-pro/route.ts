import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAdmin } from '../../../../../lib/admin/with-admin';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const POST = withAdmin(async (req: Request) => {
  try {
    const body = (await req.json()) as { userId?: string; days?: number };
    const userId = body.userId?.trim();
    let days = typeof body.days === 'number' ? body.days : 7;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!Number.isFinite(days)) {
      days = 7;
    }
    const clampedDays = Math.max(1, Math.min(30, Math.floor(days)));

    const supabase = serviceClient();
    const until = new Date(Date.now() + clampedDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('users')
      .update({ complimentary_premium_until: until })
      .eq('id', userId)
      .select(
        'id,email,role,active_plan,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,complimentary_premium_until,stripe_customer_id,stripe_subscription_id'
      )
      .maybeSingle();

    if (error) {
      console.error('admin grant-temporary-pro update error:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('admin grant-temporary-pro route error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
});

