import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";

export async function POST(request) {
  try {
    const { username, password } = await request.json().catch(() => ({}));
    
    if (!username || !password) {
      return NextResponse.json(
        { message: "الرجاء إدخال اسم المستخدم وكلمة المرور." },
        { status: 400 }
      );
    }

    // Query credentials from public.admin_credentials using service client
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("admin_credentials")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { message: "اسم المستخدم أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    // Generate base64 token
    const token = Buffer.from(`${username}:${password}`).toString("base64");

    const response = NextResponse.json({ success: true, message: "تم تسجيل الدخول بنجاح." });
    
    // Set cookie for 30 days
    response.cookies.set("coverup_admin_token", token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return response;
  } catch (err) {
    console.error("Admin Login API error:", err);
    return NextResponse.json(
      { message: "حدث خطأ في الخادم أثناء محاولة تسجيل الدخول." },
      { status: 500 }
    );
  }
}
