import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: "Could not check this email right now." }, { status: 500 });
    }

    return NextResponse.json({ exists: Boolean(data) });
  } catch {
    return NextResponse.json({ message: "Could not check this email right now." }, { status: 500 });
  }
}
