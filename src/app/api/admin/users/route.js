import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";
import { requireAdmin } from "@/utils/store-db";

export async function GET(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    const supabase = getSupabaseServerClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ profiles });
  } catch (err) {
    console.error("Admin list users error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    const { userId, role } = await request.json().catch(() => ({}));
    if (!userId || !role) {
      return NextResponse.json({ message: "userId and role are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ roles: role, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;
    
    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Admin update user role error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
