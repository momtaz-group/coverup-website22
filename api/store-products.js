const { STORE_KEYS, getJson, kvConfigured, requireAdmin, sendJson, setJson } = require("./_store");
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
  if (request.method === "GET") {
    const result = await getJson(STORE_KEYS.products, []);
    return sendJson(response, 200, {
      configured: result.configured,
      products: result.data,
    });
  }

  if (request.method === "POST") {
    if (!requireAdmin(request, response)) {
      return;
    }

    if (!kvConfigured()) {
      return sendJson(response, 501, { message: "KV storage is not configured." });
    }

    const products = Array.isArray(request.body?.products)
      ? request.body.products.map(cleanProduct).filter((product) => product.name && product.price > 0)
      : [];

    await setJson(STORE_KEYS.products, products);
    return sendJson(response, 200, { products });
  }

  return sendJson(response, 405, { message: "Method not allowed" });
};
