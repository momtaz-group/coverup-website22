import { NextResponse } from "next/server";
import { getProductById, upsertProduct, deleteProduct, requireAdmin, supabaseConfigured } from "@/utils/store-db";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

function cleanProduct(product = {}) {
  return {
    id: String(product.id || randomUUID()).trim(),
    name: String(product.name || "").trim(),
    category: String(product.category || "منتجات").trim(),
    price: Number(product.price) || 0,
    image: String(product.image || "").trim(),
    images: Array.isArray(product.images)
      ? product.images
      : String(product.images || "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    badge: String(product.badge || "متوفر").trim(),
    description: String(product.description || "").trim(),
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
    brand: String(product.brand || "").trim(),
    product_family: String(product.product_family || "").trim(),
    tags: Array.isArray(product.tags)
      ? product.tags
      : String(product.tags || "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    status: String(product.status || "public").trim(),
  };
}

export async function GET(request) {
  try {
    if (!supabaseConfigured(false)) {
      return NextResponse.json({ configured: false, product: null });
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json({ message: "اختار المنتج الأول." }, { status: 400 });
    }

    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ message: "المنتج غير موجود." }, { status: 404 });
    }

    // Check if the request is from admin
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized && product.status === 'hidden') {
      return NextResponse.json({ message: "المنتج غير متوفر حالياً." }, { status: 404 });
    }

    return NextResponse.json({ configured: true, product });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء جلب المنتج." }, { status: 500 });
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
    const product = await upsertProduct(cleanProduct(body.product || body || {}));
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء حفظ المنتج." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json({ message: "اختار المنتج أولاً." }, { status: 400 });
    }

    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء حذف المنتج." }, { status: 500 });
  }
}
