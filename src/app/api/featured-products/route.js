import { NextResponse } from "next/server";
import { getProducts, requireAdmin, supabaseConfigured } from "@/utils/store-db";
import { supabase } from "@/utils/supabase";

export const dynamic = "force-dynamic";

async function fetchFeaturedConfig() {
  try {
    const { data, error } = await supabase
      .from("featured_products_config")
      .select("*")
      .eq("id", "default")
      .single();
    if (error || !data) {
      return { mode: "custom", count: 8, product_ids: [] };
    }
    return {
      mode: data.mode || "custom",
      count: Math.min(25, Math.max(1, Number(data.count) || 8)),
      product_ids: Array.isArray(data.product_ids) ? data.product_ids : [],
    };
  } catch {
    return { mode: "custom", count: 8, product_ids: [] };
  }
}

async function computeMostSoldProductIds(limit = 25) {
  try {
    const { data: orders } = await supabase
      .from("orders")
      .select("items")
      .limit(500);

    const salesMap = {};
    if (Array.isArray(orders)) {
      for (const order of orders) {
        const items = Array.isArray(order.items) ? order.items : [];
        for (const item of items) {
          if (item?.id) {
            salesMap[item.id] = (salesMap[item.id] || 0) + (Number(item.quantity) || 1);
          }
        }
      }
    }

    const allProducts = await getProducts();
    const sorted = [...allProducts].sort((a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0));
    return sorted.slice(0, limit).map((p) => p.id);
  } catch {
    const allProducts = await getProducts();
    return allProducts.slice(0, limit).map((p) => p.id);
  }
}

export async function GET() {
  try {
    if (!supabaseConfigured(false)) {
      return NextResponse.json({ configured: false, config: { mode: "custom", count: 8, product_ids: [] }, products: [] });
    }

    const config = await fetchFeaturedConfig();
    const allProducts = await getProducts();
    const publicProducts = allProducts.filter((p) => p.status !== "hidden");
    const productMap = new Map(publicProducts.map((p) => [p.id, p]));

    let targetIds = [];
    if (config.mode === "most_sold") {
      targetIds = await computeMostSoldProductIds(config.count);
    } else {
      targetIds = (config.product_ids || []).slice(0, config.count);
    }

    let featuredList = targetIds.map((id) => productMap.get(id)).filter(Boolean);

    // If less than count, fill with latest public products
    if (featuredList.length < config.count) {
      const seen = new Set(featuredList.map((p) => p.id));
      for (const p of publicProducts) {
        if (!seen.has(p.id)) {
          featuredList.push(p);
          seen.add(p.id);
          if (featuredList.length >= config.count) break;
        }
      }
    }

    return NextResponse.json({ configured: true, config, products: featuredList });
  } catch (error) {
    return NextResponse.json({ message: error.message || "فشل تحميل المنتجات المميزة." }, { status: 500 });
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
    const mode = body.mode === "most_sold" ? "most_sold" : "custom";
    const count = Math.min(25, Math.max(1, Number(body.count) || 8));
    const product_ids = Array.isArray(body.product_ids) ? body.product_ids.map(String) : [];

    const payload = {
      id: "default",
      mode,
      count,
      product_ids,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("featured_products_config")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "فشل حفظ إعدادات المنتجات المميزة.");
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error) {
    return NextResponse.json({ message: error.message || "تعذر حفظ المنتجات المميزة." }, { status: 400 });
  }
}
