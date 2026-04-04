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

const FULL_GRANT_SELECT =
  'id,email,role,plan,active_plan,is_premium,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,complimentary_premium_until,stripe_customer_id,stripe_subscription_id';

export const POST = withAdmin(async (req: Request) => {
  try {
    const body = (await req.json()) as {
      userId?: string;
      days?: number;
      /** Sets plan=premium, active_plan=ALL_ACCESS_PRO_26, is_premium=true, plus complimentary_premium_until (days up to 365). */
      fullComplimentaryPremium?: boolean;
    };
    const userId = body.userId?.trim();
    const fullGrant = body.fullComplimentaryPremium === true;
    let days = typeof body.days === 'number' ? body.days : fullGrant ? 365 : 7;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!Number.isFinite(days)) {
      days = fullGrant ? 365 : 7;
    }
    const maxDays = fullGrant ? 365 : 30;
    const clampedDays = Math.max(1, Math.min(maxDays, Math.floor(days)));

    const supabase = serviceClient();
    const until = new Date(Date.now() + clampedDays * 24 * 60 * 60 * 1000).toISOString();

    const patch = fullGrant
      ? {
          plan: 'premium' as const,
          active_plan: 'ALL_ACCESS_PRO_26' as const,
          is_premium: true,
          complimentary_premium_until: until,
        }
      : { complimentary_premium_until: until };

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select(FULL_GRANT_SELECT)
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

