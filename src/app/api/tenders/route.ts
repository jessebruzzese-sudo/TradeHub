import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier, getLimits } from '@/lib/plan-limits';
import { checkTenderCreationLimit } from '@/lib/tender-limit-utils';
import { isAdmin } from '@/lib/is-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectName,
      projectDescription,
      suburb,
      postcode,
      isNameHidden = false,
      isAnonymous = false,
      status = 'PUBLISHED',
      tier = 'FREE_TRIAL',
      tradeRequirements = [],
    } = body;

    const isDraft = String(status || '').toUpperCase() === 'DRAFT';

    if (!isDraft) {
      if (!projectName?.trim() || !suburb?.trim() || !postcode?.trim()) {
        return NextResponse.json(
          { error: 'projectName, suburb, and postcode are required' },
          { status: 400 }
        );
      }
    }

    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, role, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    // ✅ Draft scaffolds should NOT count toward monthly tender limits
    if (!isDraft && !isAdmin(dbUser)) {
      const limitResult = await checkTenderCreationLimit(supabase, authUser.id, dbUser);
      if (!limitResult.allowed) {
        console.warn(
          `[plan-limits] user_id=${dbUser.id} tier=${getTier(dbUser)} reason=tender_per_month_limit count=${limitResult.count}`
        );
        return NextResponse.json(
          { error: limitResult.message || 'Free plan includes 1 active tender per month.' },
          { status: 403 }
        );
      }
    }

    const tenderInsert = {
      builder_id: authUser.id,
      status: isDraft ? 'DRAFT' : status,
      tier,
      is_name_hidden: !!isNameHidden,
      is_anonymous: !!isAnonymous,

      // ✅ Draft placeholders (so we can create a tenderId before user fills fields)
      project_name: isDraft
        ? String(projectName || 'Draft tender').trim()
        : String(projectName).trim(),

      project_description: String(projectDescription || '').trim(),

      suburb: isDraft ? String(suburb || '').trim() : String(suburb).trim(),
      postcode: isDraft ? String(postcode || '').trim() : String(postcode).trim(),

      // Keep as 0 for now; you can wire real geocode later
      lat: 0,
      lng: 0,
    };

    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .insert(tenderInsert)
      .select()
      .single();

    if (tenderError) {
      console.error('Tender insert error:', tenderError);
      return NextResponse.json({ error: tenderError.message }, { status: 500 });
    }

    if (Array.isArray(tradeRequirements) && tradeRequirements.length > 0) {
      const tradeReqs = tradeRequirements.map((req: any) => ({
        tender_id: tender.id,
        trade: req.trade,
        sub_description: req.subDescription || '',
        min_budget_cents: req.budgetMin ? Math.round(Number(req.budgetMin) * 100) : null,
        max_budget_cents: req.budgetMax ? Math.round(Number(req.budgetMax) * 100) : null,
      }));

      const { error: tradeError } = await supabase.from('tender_trade_requirements').insert(tradeReqs);
      if (tradeError) {
        console.error('Trade requirements insert error:', tradeError);
      }
    }

    return NextResponse.json({ tender });
  } catch (err) {
    console.error('Tenders API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
