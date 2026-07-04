const { getProductById, sendJson, supabaseConfigured } = require("./_store");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!supabaseConfigured(false)) {
      return sendJson(response, 200, { configured: false, product: null });
    }

    const id = String(request.query?.id || "").trim();
    if (!id) {
      return sendJson(response, 400, { message: "اختار المنتج الأول." });
    }

    const product = await getProductById(id);
    if (!product || product.is_active === false) {
      return sendJson(response, 404, { message: "المنتج غير موجود." });
    }

    return sendJson(response, 200, { configured: true, product });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Storage error" });
  }
};
