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
    
    // Fetch all conversations from public.memo_chats
    const { data: chats, error: chatsError } = await supabase
      .from("memo_chats")
      .select("*")
      .order("updated_at", { ascending: false });

    if (chatsError) throw chatsError;

    // Fetch profiles to map user emails/names
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name");

    const profileMap = {};
    if (!profilesError && profiles) {
      profiles.forEach(p => {
        profileMap[p.id] = p;
      });
    }

    const chatsWithUsers = chats.map(c => ({
      ...c,
      user: profileMap[c.user_id] || { email: "unknown@user.com", full_name: "مستخدم غير معروف" }
    }));

    return NextResponse.json({ chats: chatsWithUsers });
  } catch (err) {
    console.error("Admin list chats error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
