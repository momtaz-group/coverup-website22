const { findOrderForTracking, sendJson, supabaseConfigured } = require("./_store");

function cleanText(value, limit = 160) {
  return String(value || "").trim().slice(0, limit);
}

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    payment_status: order.payment_status,
    delivery_method: order.delivery_method,
    grand_total: order.grand_total,
    items: order.items || [],
    customer: {
      name: order.customer?.name || "",
      city: order.customer?.city || "",
      address: order.customer?.address || "",
    },
    status_history: order.status_history || [],
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    const order = await findOrderForTracking(
      cleanText(request.query?.orderId, 120),
      cleanText(request.query?.phone, 60),
    );

    if (!order) {
      return sendJson(response, 404, { message: "مش لاقيين طلب بالبيانات دي." });
    }

    return sendJson(response, 200, { order: publicOrder(order) });
  } catch (error) {
    return sendJson(response, 400, { message: error.message || "Tracking error" });
  }
};
