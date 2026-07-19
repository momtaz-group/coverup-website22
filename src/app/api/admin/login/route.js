import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/utils/supabase";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { rateLimit } from "@/utils/rate-limit";

const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "";

function createAdminToken(username) {
  if (!ADMIN_TOKEN_SECRET) throw new Error("ADMIN_TOKEN_SECRET is not configured");
  const payload = Buffer.from(JSON.stringify({ username, iat: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export async function POST(request) {
  try {
    // Rate limit: max 5 login attempts per minute per IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!rateLimit(`admin-login:${ip}`, { maxRequests: 5, windowMs: 60000 })) {
      return NextResponse.json(
        { message: "تم تجاوز الحد المسموح من محاولات تسجيل الدخول. يرجى المحاولة لاحقاً." },
        { status: 429 }
      );
    }

    if (!ADMIN_TOKEN_SECRET) {
      return NextResponse.json(
        { message: "Admin authentication is not configured." },
        { status: 500 }
      );
    }

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
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { message: "اسم المستخدم أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    // Verify password with bcrypt (supports both bcrypt-hashed and legacy plaintext)
    let passwordValid = false;
    if (data.password && data.password.startsWith("$2")) {
      // bcrypt hashed password
      passwordValid = await bcrypt.compare(password, data.password);
    } else {
      // Legacy plaintext comparison (for migration period only)
      passwordValid = data.password === password;
    }

    if (!passwordValid) {
      return NextResponse.json(
        { message: "اسم المستخدم أو كلمة المرور غير صحيحة." },
        { status: 401 }
      );
    }

    // Generate HMAC-signed token
    const token = createAdminToken(username);

    const response = NextResponse.json({ success: true, message: "تم تسجيل الدخول بنجاح." });
    
    // Set cookie with httpOnly, secure, sameSite flags
    response.cookies.set("coverup_admin_token", token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
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
