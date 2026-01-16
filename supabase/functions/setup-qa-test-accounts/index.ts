import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TestAccount {
  email: string;
  password: string;
  name: string;
  primaryTrade: string;
  trades: string[];
  bio: string;
}

interface AdminTestAccount {
  email: string;
  password: string;
  name: string;
  role: 'admin';
  bio: string;
}

const testAccounts: TestAccount[] = [
  {
    email: 'test+electrician@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Electrician',
    primaryTrade: 'Electrician',
    trades: ['Commercial Electrical', 'Residential Electrical'],
    bio: 'QA test account for Electrician trade visibility testing',
  },
  {
    email: 'test+plumber@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Plumber',
    primaryTrade: 'Plumber',
    trades: ['Commercial Plumbing', 'Residential Plumbing'],
    bio: 'QA test account for Plumber trade visibility testing',
  },
  {
    email: 'test+carpenter@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Carpenter',
    primaryTrade: 'Carpenter',
    trades: ['Formwork', 'Framing', 'Finishing'],
    bio: 'QA test account for Carpenter trade visibility testing',
  },
  {
    email: 'test+painter@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Painter',
    primaryTrade: 'Painter & Decorator',
    trades: ['Interior Painting', 'Exterior Painting', 'Commercial Painting'],
    bio: 'QA test account for Painter & Decorator trade visibility testing',
  },
];

const adminTestAccount: AdminTestAccount = {
  email: 'test+admin@tradebid.com.au',
  password: 'password',
  name: 'QA Test - Admin',
  role: 'admin',
  bio: 'QA test account for admin approval workflows',
};

interface ContractorTestAccount {
  email: string;
  password: string;
  name: string;
  role: 'contractor';
  bio: string;
  companyName?: string;
}

const contractorTestAccounts: ContractorTestAccount[] = [
  {
    email: 'test+contractor1@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Contractor 1',
    role: 'contractor',
    bio: 'QA test account for contractor tender creation workflows',
    companyName: 'Build Co Sydney',
  },
  {
    email: 'test+contractor2@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Contractor 2',
    role: 'contractor',
    bio: 'QA test account for multi-trade tender workflows',
    companyName: 'Premier Constructions',
  },
  {
    email: 'test+contractor3@tradebid.com.au',
    password: 'password',
    name: 'QA Test - Contractor 3',
    role: 'contractor',
    bio: 'QA test account for large project tender workflows',
    companyName: 'Metro Builders Group',
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const resetMode = body.reset === true;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results = [];

    // Create subcontractor test accounts
    for (const account of testAccounts) {
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) => u.email === account.email
        );

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;

          if (resetMode) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              { password: account.password }
            );

            if (updateError) throw updateError;

            const { error: dbUpdateError } = await supabaseAdmin
              .from('users')
              .update({
                name: account.name,
                primary_trade: account.primaryTrade,
                trades: account.trades,
                bio: account.bio,
              })
              .eq('id', userId);

            if (dbUpdateError) throw dbUpdateError;

            results.push({
              email: account.email,
              status: 'reset',
              userId,
              primaryTrade: account.primaryTrade,
            });
          } else {
            results.push({
              email: account.email,
              status: 'already_exists',
              userId,
            });
          }
        } else {
          const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
              email: account.email,
              password: account.password,
              email_confirm: true,
              user_metadata: {
                name: account.name,
              },
            });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Failed to create user');

          userId = authData.user.id;

          const { error: dbError } = await supabaseAdmin.from('users').insert({
            id: userId,
            email: account.email,
            name: account.name,
            role: 'subcontractor',
            trust_status: 'verified',
            primary_trade: account.primaryTrade,
            trades: account.trades,
            location: 'Melbourne',
            radius: 50,
            rating: 4.8,
            reliability_rating: 4.9,
            completed_jobs: 15,
            member_since: new Date().toISOString(),
            bio: account.bio,
            subcontractor_plan: 'PRO_10',
            subcontractor_sub_status: 'ACTIVE',
            subcontractor_sub_renews_at: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            subcontractor_preferred_radius_km: 50,
            subcontractor_alerts_enabled: true,
            subcontractor_alert_channel_in_app: true,
            subcontractor_alert_channel_email: true,
            subcontractor_alert_channel_sms: false,
          });

          if (dbError) throw dbError;

          results.push({
            email: account.email,
            status: 'created',
            userId,
            primaryTrade: account.primaryTrade,
          });
        }
      } catch (error) {
        results.push({
          email: account.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create admin test account
    try {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAdmin = existingUsers?.users?.find(
        (u) => u.email === adminTestAccount.email
      );

      let adminUserId: string;

      if (existingAdmin) {
        adminUserId = existingAdmin.id;

        if (resetMode) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            adminUserId,
            { password: adminTestAccount.password }
          );

          if (updateError) throw updateError;

          const { error: dbUpdateError } = await supabaseAdmin
            .from('users')
            .update({
              name: adminTestAccount.name,
              role: adminTestAccount.role,
              bio: adminTestAccount.bio,
            })
            .eq('id', adminUserId);

          if (dbUpdateError) throw dbUpdateError;

          results.push({
            email: adminTestAccount.email,
            status: 'reset',
            userId: adminUserId,
            role: adminTestAccount.role,
          });
        } else {
          results.push({
            email: adminTestAccount.email,
            status: 'already_exists',
            userId: adminUserId,
          });
        }
      } else {
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: adminTestAccount.email,
            password: adminTestAccount.password,
            email_confirm: true,
            user_metadata: {
              name: adminTestAccount.name,
            },
          });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create admin user');

        adminUserId = authData.user.id;

        const { error: dbError } = await supabaseAdmin.from('users').insert({
          id: adminUserId,
          email: adminTestAccount.email,
          name: adminTestAccount.name,
          role: adminTestAccount.role,
          trust_status: 'verified',
          location: 'Melbourne',
          rating: 5.0,
          completed_jobs: 0,
          member_since: new Date().toISOString(),
          bio: adminTestAccount.bio,
        });

        if (dbError) throw dbError;

        results.push({
          email: adminTestAccount.email,
          status: 'created',
          userId: adminUserId,
          role: adminTestAccount.role,
        });
      }
    } catch (error) {
      results.push({
        email: adminTestAccount.email,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Create contractor test accounts
    for (const contractorAccount of contractorTestAccounts) {
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingContractor = existingUsers?.users?.find(
          (u) => u.email === contractorAccount.email
        );

        let contractorUserId: string;

        if (existingContractor) {
          contractorUserId = existingContractor.id;

          if (resetMode) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              contractorUserId,
              { password: contractorAccount.password }
            );

            if (updateError) throw updateError;

            const { error: dbUpdateError } = await supabaseAdmin
              .from('users')
              .update({
                name: contractorAccount.name,
                role: contractorAccount.role,
                bio: contractorAccount.bio,
              })
              .eq('id', contractorUserId);

            if (dbUpdateError) throw dbUpdateError;

            results.push({
              email: contractorAccount.email,
              status: 'reset',
              userId: contractorUserId,
              role: contractorAccount.role,
            });
          } else {
            results.push({
              email: contractorAccount.email,
              status: 'already_exists',
              userId: contractorUserId,
            });
          }
        } else {
          const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
              email: contractorAccount.email,
              password: contractorAccount.password,
              email_confirm: true,
              user_metadata: {
                name: contractorAccount.name,
              },
            });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Failed to create contractor user');

          contractorUserId = authData.user.id;

          const { error: dbError } = await supabaseAdmin.from('users').insert({
            id: contractorUserId,
            email: contractorAccount.email,
            name: contractorAccount.name,
            role: contractorAccount.role,
            trust_status: 'verified',
            location: 'Melbourne',
            rating: 4.9,
            completed_jobs: 25,
            member_since: new Date().toISOString(),
            bio: contractorAccount.bio,
            builder_plan: 'NONE',
            builder_sub_status: 'NONE',
            builder_free_trial_tender_used: false,
          });

          if (dbError) throw dbError;

          results.push({
            email: contractorAccount.email,
            status: 'created',
            userId: contractorUserId,
            role: contractorAccount.role,
          });
        }
      } catch (error) {
        results.push({
          email: contractorAccount.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: resetMode ? 'QA test accounts reset completed' : 'QA test accounts setup completed',
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
