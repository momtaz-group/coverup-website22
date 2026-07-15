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

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const result = await sendTransactionalEmail("welcome", {
      to: cleanEmail,
      user_id: profile.id,
      customerName: profile.full_name || profile.name || "عميل CoverUp",
      username: profile.username || "",
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Welcome email route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
