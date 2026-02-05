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
    const body = (await req.json()) as { emailOrId?: string };
    const emailOrId = body.emailOrId?.trim();

    if (!emailOrId) {
      return NextResponse.json({ error: 'emailOrId is required' }, { status: 400 });
    }

    const supabase = serviceClient();

    // Try lookup by id first
    let { data, error } = await supabase
      .from('users')
      .select(
        'id,email,name,role,active_plan,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,complimentary_premium_until,stripe_customer_id,stripe_subscription_id'
      )
      .eq('id', emailOrId)
      .maybeSingle();

    if ((error && (error as any).code === 'PGRST116') || !data) {
      // Fallback to email lookup
      const res = await supabase
        .from('users')
        .select(
          'id,email,name,role,active_plan,subscription_status,subscription_renews_at,subscription_started_at,subscription_canceled_at,complimentary_premium_until,stripe_customer_id,stripe_subscription_id'
        )
        .eq('email', emailOrId.toLowerCase())
        .maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('admin users lookup error:', error);
      return NextResponse.json({ error: 'Failed to lookup user' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('admin users lookup route error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
});

