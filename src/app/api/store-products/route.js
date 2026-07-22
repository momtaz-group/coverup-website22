import { NextResponse } from "next/server";
import { getProducts, setProducts, requireAdmin, supabaseConfigured } from "@/utils/store-db";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

function cleanProduct(product) {
  return {
    id: String(product.id || randomUUID()).trim(),
    name: String(product.name || "").trim(),
    name_en: String(product.name_en || product.nameEn || "").trim(),
    category: String(product.category || "منتجات").trim(),
    category_en: String(product.category_en || product.categoryEn || "").trim(),
    price: Number(product.price) || 0,
    image: String(product.image || "").trim(),
    images: Array.isArray(product.images)
      ? product.images
      : String(product.images || "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    badge: String(product.badge || "متوفر").trim(),
    badge_en: String(product.badge_en || product.badgeEn || "").trim(),
    description: String(product.description || "").trim(),
    description_en: String(product.description_en || product.descriptionEn || "").trim(),
    seo_title: String(product.seo_title || product.seoTitle || "").trim(),
    seo_description: String(product.seo_description || product.seoDescription || "").trim(),
    sku: String(product.sku || "").trim(),
    stock_quantity: Math.max(0, Number(product.stock_quantity ?? product.stockQuantity ?? 0)),
    is_in_stock: product.is_in_stock ?? product.isInStock,
    compatible_models: Array.isArray(product.compatible_models)
      ? product.compatible_models
      : String(product.compatible_models || product.compatibleModels || "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    colors: Array.isArray(product.colors)
      ? product.colors
      : String(product.colors || "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    material: String(product.material || "").trim(),
    featured: Boolean(product.featured),
    status: String(product.status || "public").trim(),
    brand: String(product.brand || "").trim(),
    product_family: String(product.product_family || "").trim(),
    tags: Array.isArray(product.tags)
      ? product.tags
      : String(product.tags || "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
  };
}

export async function GET(request) {
  try {
    if (!supabaseConfigured(false)) {
      return NextResponse.json({ configured: false, products: [] });
    }
    const { searchParams } = new URL(request.url);
    const isAdminQuery = searchParams.get("admin") === "1" || searchParams.get("admin") === "true";
    let products = await getProducts();
    
    // Check if the request is from admin
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized && !isAdminQuery) {
      // If not admin, filter out hidden products
      products = products.filter(p => p.status !== 'hidden');
    }

    return NextResponse.json({ configured: true, products });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
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
    const products = Array.isArray(body?.products)
      ? body.products.map(cleanProduct).filter((product) => product.name && product.price > 0)
      : [];

    const savedProducts = await setProducts(products);
    return NextResponse.json({ products: savedProducts });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
