import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ValidateQuoteRequest {
  tenderId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tenderId }: ValidateQuoteRequest = await req.json();

    if (!tenderId) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Tender ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, active_plan, subscription_status, complimentary_premium_until, primary_trade, abn')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check ABN requirement
    const hasABN = !!(userData.abn && userData.abn.trim().length > 0);
    if (!hasABN && userData.role !== 'admin') {
      return new Response(
        JSON.stringify({
          canSubmit: false,
          reason: 'ABN required',
          message: 'You must verify your business with an ABN before submitting quotes'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single-account paid entitlement: unlimited quotes for paid or complimentary users.
    const isPaid =
      (userData.active_plan === 'BUSINESS_PRO_20' ||
        userData.active_plan === 'SUBCONTRACTOR_PRO_10' ||
        userData.active_plan === 'ALL_ACCESS_PRO_26') &&
      (userData.subscription_status || '').toUpperCase() === 'ACTIVE';
    const isComplimentary = (() => {
      const until = userData.complimentary_premium_until;
      if (!until) return false;
      const date = new Date(until);
      return !Number.isNaN(date.getTime()) && date > new Date();
    })();
    const isPaidOrComplimentary = isPaid || isComplimentary;

    if (!isPaidOrComplimentary && userData.role !== 'admin') {
      // Get start of current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: monthlyQuotes, error: quotesError } = await supabase
        .from('tender_quotes')
        .select('id')
        .eq('contractor_id', user.id)
        .gte('created_at', monthStart.toISOString());

      if (quotesError) {
        return new Response(
          JSON.stringify({ canSubmit: false, reason: 'Error checking quote limit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (monthlyQuotes && monthlyQuotes.length >= 1) {
        return new Response(
          JSON.stringify({
            canSubmit: false,
            reason: 'Quote limit reached',
            message: 'Free users can submit 1 quote per month. Upgrade to Premium for unlimited quotes.'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: tenderData, error: tenderError } = await supabase
      .from('tenders')
      .select('id, status, limited_quotes_enabled, quote_cap_total, quote_count_total, builder_id')
      .eq('id', tenderId)
      .maybeSingle();

    if (tenderError || !tenderData) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Tender not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if tender is from the same user (can't quote own tender)
    if (tenderData.builder_id === user.id) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Cannot quote your own tender' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check tender status
    if (tenderData.status !== 'LIVE') {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Tender is not accepting quotes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check quote cap
    if (tenderData.quote_cap_total !== null && tenderData.quote_count_total >= tenderData.quote_cap_total) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Quote cap reached' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check limited quotes enforcement - blocks ALL business users when enabled
    if (tenderData.limited_quotes_enabled && userData.role !== 'admin') {
      return new Response(
        JSON.stringify({
          canSubmit: false,
          reason: 'Limited quotes enabled',
          message: 'This tender has limited quote submissions to protect against lead-selling'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has matching trade
    const { data: tradeRequirements, error: tradeError } = await supabase
      .from('tender_trade_requirements')
      .select('trade')
      .eq('tender_id', tenderId);

    if (tradeError) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Error checking trade requirements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasTrade = tradeRequirements?.some(req => req.trade === userData.primary_trade);
    if (!hasTrade && userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Your trade does not match this tender' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already submitted a quote
    const { data: existingQuote, error: quoteCheckError } = await supabase
      .from('tender_quotes')
      .select('id')
      .eq('tender_id', tenderId)
      .eq('contractor_id', user.id)
      .maybeSingle();

    if (quoteCheckError && quoteCheckError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'Error checking existing quotes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingQuote) {
      return new Response(
        JSON.stringify({ canSubmit: false, reason: 'You have already submitted a quote for this tender' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All checks passed
    return new Response(
      JSON.stringify({ canSubmit: true, reason: 'All validations passed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating quote submission:', error);
    return new Response(
      JSON.stringify({ canSubmit: false, reason: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
