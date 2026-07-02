const { getProducts, requireAdmin, sendJson, setProducts, supabaseConfigured } = require("./_store");
const { randomUUID } = require("node:crypto");

function cleanProduct(product) {
  return {
    id: String(product.id || randomUUID()).trim(),
    name: String(product.name || "").trim(),
    category: String(product.category || "منتجات").trim(),
    price: Number(product.price) || 0,
    image: String(product.image || "").trim(),
    badge: String(product.badge || "متوفر").trim(),
    description: String(product.description || "").trim(),
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
