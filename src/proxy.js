import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/utils/supabase-proxy";

const ADMIN_CREDENTIALS_HASH = "QVJpYW5hX0dyYW5EeTpNb210YXpfYmV0YTNfZWxfTWE3bA=="; // Base64 of ARiana_GranDy:Momtaz_beta3_el_Ma7l

export async function proxy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Guard admin pages
  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("coverup_admin_token")?.value;
    if (adminToken !== ADMIN_CREDENTIALS_HASH) {
      const loginUrl = new URL("/account", request.url);
      loginUrl.searchParams.set("showAdminLogin", "true");
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Guard admin API endpoints
  const adminApiRoutes = [
    "/api/store-events",
    "/api/admin-orders",
    "/api/storage-upload",
    "/api/store-product"
  ];
  if (adminApiRoutes.some(route => pathname.startsWith(route))) {
    const adminToken = request.cookies.get("coverup_admin_token")?.value;
    const providedUser = request.headers.get("x-admin-username");
    const providedPass = request.headers.get("x-admin-password");

    const hasValidCookie = adminToken === ADMIN_CREDENTIALS_HASH;
    const hasValidHeaders = providedUser === "ARiana_GranDy" && providedPass === "Momtaz_beta3_el_Ma7l";

    if (!hasValidCookie && !hasValidHeaders) {
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
