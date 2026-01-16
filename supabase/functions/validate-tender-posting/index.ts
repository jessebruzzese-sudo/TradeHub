import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
        JSON.stringify({ canPost: false, reason: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ canPost: false, reason: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, active_plan, subscription_status')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ canPost: false, reason: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { role, active_plan, subscription_status } = userData;

    // Admins can always post
    if (role === 'admin') {
      return new Response(
        JSON.stringify({ canPost: true, reason: 'Admin access' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Contractors can always post
    if (role === 'contractor') {
      return new Response(
        JSON.stringify({ canPost: true, reason: 'Contractor access' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Subcontractors can only post if they have premium plan
    if (role === 'subcontractor') {
      const hasPremium = (
        (active_plan === 'SUBCONTRACTOR_PRO_10' || active_plan === 'ALL_ACCESS_PRO_26') &&
        subscription_status === 'ACTIVE'
      );

      if (hasPremium) {
        return new Response(
          JSON.stringify({ canPost: true, reason: 'Premium subcontractor access' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          canPost: false,
          reason: 'Premium subscription required',
          upgradeRequired: true,
          message: 'Upgrade to Subcontractor Pro to post tenders'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ canPost: false, reason: 'Invalid role' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating tender posting:', error);
    return new Response(
      JSON.stringify({ canPost: false, reason: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
