import { NextResponse } from "next/server";
import {
  getProductById,
  getProductVersions,
  upsertProduct,
  replaceProductVersions,
  deleteProduct,
  requireAdmin,
  supabaseConfigured,
} from "@/utils/store-db";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

const DEVICE_VERSION_CATEGORY_PATTERNS = [
  "phone cases",
  "phone covers",
  "cases",
  "covers",
  "screen protectors",
  "screen protection",
  "كفر",
  "كفرات",
  "حماية الشاشة",
  "اسكرينة",
  "سكرينة",
];

function isDeviceVersionCategory(category = "") {
  const value = String(category || "").trim().toLowerCase();
  return DEVICE_VERSION_CATEGORY_PATTERNS.some((pattern) => value.includes(pattern));
}

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
    product_type: String(product.product_type || product.productType || "simple").trim(),
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

    const versions = await getProductVersions(id, { service: adminCheck.authorized });
    return NextResponse.json({ configured: true, product: { ...product, versions } });
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
    const rawProduct = body.product || body || {};
    const cleanedProduct = cleanProduct(rawProduct);
    const shouldUseVersions = isDeviceVersionCategory(cleanedProduct.category);
    const versionsInput = Array.isArray(rawProduct.versions) ? rawProduct.versions : [];

    cleanedProduct.product_type = shouldUseVersions ? "device_versions" : "simple";
    if (!shouldUseVersions && Object.hasOwn(rawProduct, "versions") && versionsInput.length > 0) {
      return NextResponse.json({ message: "Product versions are only available for Phone Cases and Screen Protectors." }, { status: 400 });
    }
    if (shouldUseVersions && versionsInput.length === 0) {
      return NextResponse.json({ message: "Add at least one product version for this category before saving." }, { status: 400 });
    }

    if (shouldUseVersions && versionsInput.length > 0) {
      const calculatedTotalStock = versionsInput.reduce((sum, v) => sum + (v.status !== "inactive" ? Math.max(0, Number(v.stock_quantity ?? v.stockQuantity ?? 0)) : 0), 0);
      cleanedProduct.stock_quantity = calculatedTotalStock;
      cleanedProduct.is_in_stock = calculatedTotalStock > 0;
    }

    const product = await upsertProduct(cleanedProduct);
    const versions = shouldUseVersions && Object.hasOwn(rawProduct, "versions")
      ? await replaceProductVersions(product.id, Array.isArray(rawProduct.versions) ? rawProduct.versions : [])
      : await getProductVersions(product.id, { service: true });
    return NextResponse.json({ product: { ...product, versions } });
  } catch (error) {
    console.error("Error saving product:", error);
    return NextResponse.json({ message: error.message || "حدث خطأ أثناء حفظ المنتج." }, { status: 400 });
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
