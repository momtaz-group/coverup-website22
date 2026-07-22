import { NextResponse } from "next/server";
import {
  getCategories,
  requireAdmin,
  supabaseConfigured,
  upsertCategory,
} from "@/utils/store-db";

export async function GET(request) {
  try {
    if (!supabaseConfigured(false)) {
      return NextResponse.json({ configured: false, categories: [] });
    }

    const includeInactive = new URL(request.url).searchParams.get("admin") === "1";
    if (includeInactive) {
      const adminCheck = requireAdmin(request);
      if (!adminCheck.authorized) {
        return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
      }
    }

    const categories = await getCategories({
      service: includeInactive,
      includeInactive,
    });
    return NextResponse.json({ configured: true, categories });
  } catch (error) {
    return NextResponse.json({ message: "تعذر تحميل الأقسام." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const existing = await getCategories({ service: true, includeInactive: true });
    const category = await upsertCategory({
      name: body.name,
      image_url: body.image_url,
      sort_order: body.sort_order ?? existing.length,
      is_active: true,
    });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ message: error.message || "تعذر حفظ القسم." }, { status: 400 });
  }
}
