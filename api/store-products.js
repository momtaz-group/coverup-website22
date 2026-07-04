const { getProducts, requireAdmin, sendJson, setProducts, supabaseConfigured } = require("./_store");
const { randomUUID } = require("node:crypto");

function cleanProduct(product) {
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
  };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      if (!supabaseConfigured(false)) {
        return sendJson(response, 200, { configured: false, products: [] });
      }

      const products = await getProducts();
      return sendJson(response, 200, { configured: true, products });
    }

    if (request.method === "POST") {
      if (!requireAdmin(request, response)) {
        return;
      }

      if (!supabaseConfigured(true)) {
        return sendJson(response, 501, { message: "Supabase service role is not configured." });
      }

      const products = Array.isArray(request.body?.products)
        ? request.body.products.map(cleanProduct).filter((product) => product.name && product.price > 0)
        : [];

      const savedProducts = await setProducts(products);
      return sendJson(response, 200, { products: savedProducts });
    }

    return sendJson(response, 405, { message: "Method not allowed" });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Storage error" });
  }
};
