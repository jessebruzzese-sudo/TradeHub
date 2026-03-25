// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createEmailEvent } from "@/lib/email/create-email-event";
import { shouldSendEmailNow } from "@/lib/email/rollout";

type AbnStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export async function POST(
  request: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const abn_status = body?.abn_status as AbnStatus | undefined;
    const reason = body?.reason as string | undefined;

    if (
      !abn_status ||
      !["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].includes(abn_status)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid abn_status. Must be UNVERIFIED, PENDING, VERIFIED, or REJECTED",
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const { userId } = await requireAdmin(supabase);

    type UsersUpdate = Database['public']['Tables']['users']['Update'];
    const updateData: UsersUpdate = { abn_status };

    if (abn_status === "VERIFIED") {
      updateData.abn_verified_at = new Date().toISOString();
      updateData.abn_verified_by = userId;
      updateData.abn_rejection_reason = null;
      updateData.abn_verified = true;
    } else if (abn_status === "REJECTED") {
      updateData.abn_rejection_reason = reason ?? null;
      updateData.abn_verified_at = null;
      updateData.abn_verified_by = null;
      updateData.abn_verified = false;
    } else {
      updateData.abn_rejection_reason = null;
      updateData.abn_verified_at = null;
      updateData.abn_verified_by = null;
      updateData.abn_verified = false;
    }

    const { data: beforeUser } = await supabase
      .from("users")
      .select("id, email, name, abn_status")
      .eq("id", id)
      .maybeSingle();

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, email, name, abn_status")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Core profile update is committed. Email is a best-effort side effect.
    try {
      const movedToVerified =
        beforeUser?.abn_status !== "VERIFIED" &&
        updatedUser?.abn_status === "VERIFIED";

      if (movedToVerified && updatedUser?.email) {
        await createEmailEvent({
          userId: updatedUser.id,
          toEmail: updatedUser.email,
          emailType: "abn_verified",
          payload: {
            firstName: updatedUser.name?.split?.(/\s+/)?.[0] || undefined,
            profileUrl: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tradehub.com.au"}/profile`,
          },
          idempotencyKey: `abn_verified:${updatedUser.id}:${updatedUser.abn_status}`,
          triggerSendImmediately: shouldSendEmailNow({
            emailType: "abn_verified",
            toEmail: updatedUser.email,
          }),
        });
      }
    } catch (emailErr) {
      console.error("[admin/users/abn] abn_verified email side effect failed", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
