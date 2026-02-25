import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Soft delete user row
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userId);

    if (userError) throw userError;

    // Delete auth user
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) throw authError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
