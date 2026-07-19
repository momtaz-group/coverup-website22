import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "البريد الإلكتروني مطلوب" },
        { status: 400 }
      );
    }

    // Always return the same generic response to prevent email enumeration
    return NextResponse.json({
      message: "تم استلام طلبك.",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "حدث خطأ." },
      { status: 500 }
    );
  }
}
