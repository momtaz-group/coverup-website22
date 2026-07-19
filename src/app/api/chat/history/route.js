import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";
import { getAuthenticatedUser } from "@/utils/server-auth";

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ chats: [] });
    }

    const supabase = getSupabaseServerClient();
    const { data: chats, error } = await supabase
      .from("memo_chats")
      .select("id, title, summary, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ chats: chats || [] });
  } catch (err) {
    console.error("Chat history error:", err);
    return NextResponse.json({ chats: [] });
  }
}
