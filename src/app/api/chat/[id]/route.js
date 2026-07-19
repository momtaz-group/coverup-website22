import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";
import { getAuthenticatedUser } from "@/utils/server-auth";

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("id");
    if (!chatId) {
      return NextResponse.json({ message: "Missing chat id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: chat, error } = await supabase
      .from("memo_chats")
      .select("id, title, summary, messages, created_at, updated_at")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (error || !chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch (err) {
    console.error("Chat load error:", err);
    return NextResponse.json({ message: "Error loading chat" }, { status: 500 });
  }
}
