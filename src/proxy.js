import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/utils/supabase-proxy";
import crypto from "node:crypto";

const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

function verifyAdminToken(token) {
  if (!ADMIN_TOKEN_SECRET || !token) return false;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expectedSig = crypto.createHmac("sha256", ADMIN_TOKEN_SECRET).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"));
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Guard admin pages
  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("coverup_admin_token")?.value;
    const isValid = verifyAdminToken(adminToken);
    if (!isValid) {
      const loginUrl = new URL("/account", request.url);
      loginUrl.searchParams.set("showAdminLogin", "true");
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Guard admin API endpoints
  const adminApiRoutes = [
    "/api/admin-orders"
  ];
  if (adminApiRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))) {
    const adminToken = request.cookies.get("coverup_admin_token")?.value;
    const isValid = verifyAdminToken(adminToken);

    if (!isValid) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  // 3. Update Supabase Session (refreshes user sessions and updates cookies)
  return await updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
