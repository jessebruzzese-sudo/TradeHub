import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin/require-admin";

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

    const updateData: Record<string, unknown> = { abn_status };

    if (abn_status === "VERIFIED") {
      updateData.abn_verified_at = new Date().toISOString();
      updateData.abn_verified_by = userId;
      updateData.abn_rejection_reason = null;
    } else if (abn_status === "REJECTED") {
      updateData.abn_rejection_reason = reason ?? null;
      updateData.abn_verified_at = null;
      updateData.abn_verified_by = null;
    } else {
      updateData.abn_rejection_reason = null;
      updateData.abn_verified_at = null;
      updateData.abn_verified_by = null;
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
