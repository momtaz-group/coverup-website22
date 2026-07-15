import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";
import { sendTransactionalEmail } from "@/utils/email";

export async function POST(request) {
  try {
    const { email } = await request.json().catch(() => ({}));
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const supabaseServer = getSupabaseServerClient();
    const { data: profile, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    const name = profile ? (profile.full_name || profile.name) : "عميل CoverUp";
    const userId = profile ? profile.id : null;

    const result = await sendTransactionalEmail("password_changed", {
      to: cleanEmail,
      user_id: userId,
      customerName: name,
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Password changed email route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
