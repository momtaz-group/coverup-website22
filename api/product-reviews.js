const {
  createVerifiedReview,
  getPublicProductReviews,
  sendJson,
  supabaseConfigured,
} = require("./_store");

function cleanText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

module.exports = async function handler(request, response) {
  try {
    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    if (request.method === "GET") {
      const productId = cleanText(request.query?.productId, 120);
      const reviews = await getPublicProductReviews(productId);
      return sendJson(response, 200, { reviews });
    }

    if (request.method === "POST") {
      const review = await createVerifiedReview({
        orderId: cleanText(request.body?.orderId, 120),
        productId: cleanText(request.body?.productId, 120),
        phone: cleanText(request.body?.phone, 60),
        rating: request.body?.rating,
        message: cleanText(request.body?.message, 1000),
      });

      return sendJson(response, 200, { review });
    }

    return sendJson(response, 405, { message: "Method not allowed" });
  } catch (error) {
    return sendJson(response, 400, { message: error.message || "Review error" });
  }
};
