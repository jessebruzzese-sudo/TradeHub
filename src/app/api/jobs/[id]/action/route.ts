// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createEmailEvent } from '@/lib/email/create-email-event';
import {
  buildHireConfirmedTemplateData,
  buildJobInviteTemplateData,
} from '@/lib/email/email-template-data';
import { jobsListingWindowStartIso } from '@/lib/jobs/listing-window';

export const dynamic = 'force-dynamic';

type Action = 'accept' | 'decline' | 'confirm' | 'select';

/**
 * POST /api/jobs/[id]/action
 * Body: { action: 'accept' | 'decline' | 'confirm' | 'select', applicationId?: string }
 * - select: contractor selects a subcontractor (requires applicationId)
 * - accept: subcontractor accepts job offer
 * - decline: subcontractor declines job offer
 * - confirm: contractor confirms hire
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await ctx.params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const body = await request.json();
    const action = body?.action as Action;
    if (!action || !['accept', 'decline', 'confirm', 'select'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept, decline, confirm, or select' }, { status: 400 });
    }
    const applicationId = body?.applicationId as string | undefined;

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, contractor_id, status, selected_subcontractor, title, location, starts_at')
      .eq('id', jobId)
      .gte('created_at', jobsListingWindowStartIso())
      .maybeSingle();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isContractor = job.contractor_id === authUser.id;

    if (action === 'select') {
      if (!applicationId) {
        return NextResponse.json({ error: 'applicationId required for select action' }, { status: 400 });
      }
      if (job.status !== 'open') {
        return NextResponse.json({ error: 'Job is not in open state' }, { status: 400 });
      }
      if (!isContractor) {
        return NextResponse.json({ error: 'Only contractor can select a subcontractor' }, { status: 403 });
      }

      const { data: app } = await supabase
        .from('applications')
        .select('id, subcontractor_id')
        .eq('id', applicationId)
        .eq('job_id', jobId)
        .maybeSingle();

      if (!app) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      const { error: jobUpdateErr } = await supabase
        .from('jobs')
        .update({
          status: 'accepted',
          selected_subcontractor: app.subcontractor_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .gte('created_at', jobsListingWindowStartIso());
      if (jobUpdateErr) {
        return NextResponse.json({ error: jobUpdateErr.message }, { status: 500 });
      }
      const { error: appUpdateErr } = await supabase
        .from('applications')
        .update({ status: 'selected', updated_at: new Date().toISOString() })
        .eq('id', applicationId);
      if (appUpdateErr) {
        return NextResponse.json({ error: appUpdateErr.message }, { status: 500 });
      }

      // Core record state has been committed. Email is a side effect only.
      try {
        const [{ data: recipient }, { data: contractor }] = await Promise.all([
          supabase
            .from('users')
            .select('id, email, name')
            .eq('id', app.subcontractor_id)
            .maybeSingle(),
          supabase
            .from('users')
            .select('id, name')
            .eq('id', authUser.id)
            .maybeSingle(),
        ]);

        if (recipient?.email) {
          await createEmailEvent({
            userId: recipient.id,
            toEmail: recipient.email,
            emailType: 'job_invite',
            payload: buildJobInviteTemplateData({
              recipientName: recipient.name,
              inviterName: contractor?.name,
              jobTitle: job.title || 'Job opportunity',
              location: job.location,
              jobId,
              inviterId: authUser.id,
            }),
            idempotencyKey: `job_invite:${jobId}:${app.subcontractor_id}`,
            triggerSendImmediately: true,
          });
        }
      } catch (emailErr) {
        console.error('[jobs/action] job_invite email side effect failed', emailErr);
      }
    } else if (action === 'accept' || action === 'decline') {
      if (job.status !== 'accepted') {
        return NextResponse.json({ error: 'Job is not in accepted state' }, { status: 400 });
      }
      if (isContractor) {
        return NextResponse.json({ error: 'Only subcontractor can accept or decline' }, { status: 403 });
      }

      const { data: myApp } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('subcontractor_id', authUser.id)
        .maybeSingle();

      if (!myApp) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      if (action === 'accept') {
        const { error: jobUpdateErr } = await supabase
          .from('jobs')
          .update({
            status: 'confirmed',
            confirmed_subcontractor: authUser.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .gte('created_at', jobsListingWindowStartIso());
        if (jobUpdateErr) {
          return NextResponse.json({ error: jobUpdateErr.message }, { status: 500 });
        }
        const { error: appUpdateErr } = await supabase
          .from('applications')
          .update({ status: 'accepted', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', myApp.id);
        if (appUpdateErr) {
          return NextResponse.json({ error: appUpdateErr.message }, { status: 500 });
        }
      } else {
        const { error: jobUpdateErr } = await supabase
          .from('jobs')
          .update({
            status: 'open',
            selected_subcontractor: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .gte('created_at', jobsListingWindowStartIso());
        if (jobUpdateErr) {
          return NextResponse.json({ error: jobUpdateErr.message }, { status: 500 });
        }
        const { error: appUpdateErr } = await supabase
          .from('applications')
          .update({ status: 'declined', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', myApp.id);
        if (appUpdateErr) {
          return NextResponse.json({ error: appUpdateErr.message }, { status: 500 });
        }
      }
    } else if (action === 'confirm') {
      if (job.status !== 'accepted') {
        return NextResponse.json({ error: 'Job is not in accepted state' }, { status: 400 });
      }
      if (!isContractor) {
        return NextResponse.json({ error: 'Only contractor can confirm hire' }, { status: 403 });
      }
      const selectedId = job.selected_subcontractor;
      if (!selectedId) {
        return NextResponse.json({ error: 'No subcontractor selected' }, { status: 400 });
      }

      const { data: selectedApp } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('subcontractor_id', selectedId)
        .maybeSingle();

      if (!selectedApp) {
        return NextResponse.json({ error: 'Selected application not found' }, { status: 404 });
      }

      const { error: jobUpdateErr } = await supabase
        .from('jobs')
        .update({
          status: 'confirmed',
          confirmed_subcontractor: selectedId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .gte('created_at', jobsListingWindowStartIso());
      if (jobUpdateErr) {
        return NextResponse.json({ error: jobUpdateErr.message }, { status: 500 });
      }
      const { error: appUpdateErr } = await supabase
        .from('applications')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', selectedApp.id);
      if (appUpdateErr) {
        return NextResponse.json({ error: appUpdateErr.message }, { status: 500 });
      }

      // Core record state has been committed. Email is a side effect only.
      try {
        const { data: recipient } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('id', selectedId)
          .maybeSingle();

        if (recipient?.email) {
          await createEmailEvent({
            userId: recipient.id,
            toEmail: recipient.email,
            emailType: 'hire_confirmed',
            payload: buildHireConfirmedTemplateData({
              recipientName: recipient.name,
              title: job.title || 'Job',
              whenLabel: job.starts_at || undefined,
              detailsPath: `/jobs/${jobId}`,
            }),
            idempotencyKey: `hire_confirmed:${jobId}:${selectedId}`,
            triggerSendImmediately: true,
          });
        }
      } catch (emailErr) {
        console.error('[jobs/action] hire_confirmed email side effect failed', emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('jobs action API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
