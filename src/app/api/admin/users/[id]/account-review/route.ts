// @ts-nocheck - Supabase client type inference
import { NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  adminAuthErrorResponseOrNull,
  requireAdmin,
} from '@/lib/admin/require-admin';

type AdminAccountReviewsInsert = Database['public']['Tables']['admin_account_reviews']['Insert'];
type AdminAccountReviewsUpdate = Database['public']['Tables']['admin_account_reviews']['Update'];

type Status = 'approved' | 'rejected' | 'pending';
type DbStatus = 'reviewed' | 'flagged' | 'suspended' | 'pending';

function mapStatusToDb(status: Status): DbStatus {
  if (status === 'approved') return 'reviewed';
  if (status === 'rejected') return 'flagged';
  return 'pending';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdmin();
    const userId = user.id;
    const { id } = await params;

    const body = await request.json();
    const status = body?.status as Status | undefined;
    const notes = body?.notes as string | undefined;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return Response.json(
        { ok: false, error: 'Invalid status. Must be approved, rejected, or pending' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const dbStatus = mapStatusToDb(status);

    const existingResult = await supabase
      .from('admin_account_reviews')
      .select('id')
      .eq('user_id', id)
      .maybeSingle();
    const existing = existingResult.data;

    const updateData: AdminAccountReviewsUpdate = {
      status: dbStatus,
      notes: notes || null,
    };
    if (status === 'approved' || status === 'rejected') {
      updateData.reviewed_by = userId;
      updateData.reviewed_at = new Date().toISOString();
      if (status === 'rejected') {
        updateData.flag_reason = notes || null;
      } else {
        updateData.flag_reason = null;
      }
    }

    if (existing) {
      const { error } = await supabase
        .from('admin_account_reviews')
        .update(updateData)
        .eq('id', existing.id);

      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
      }
    } else {
      const insertData: AdminAccountReviewsInsert = {
        user_id: id,
        status: dbStatus,
        notes: notes || null,
        reviewed_by: status === 'approved' || status === 'rejected' ? userId : null,
        reviewed_at: status === 'approved' || status === 'rejected' ? new Date().toISOString() : null,
        flag_reason: status === 'rejected' ? notes || null : null,
      };
      const { error } = await supabase.from('admin_account_reviews').insert(insertData);

      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    if (status === 'approved') {
      await supabase.from('users').update({ account_reviewed: true }).eq('id', id);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const auth = adminAuthErrorResponseOrNull(err);
    if (auth) return auth;
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
