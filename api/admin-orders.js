const { sendTransactionalEmail } = require("./_email");
const {
  ORDER_STATUSES,
  findOrderById,
  releaseInventoryForOrder,
  requireAdmin,
  reserveInventoryForOrder,
  sendJson,
  supabaseConfigured,
  updateOrderStatus,
} = require("./_store");

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

function emailTypeForStatus(status) {
  switch (status) {
    case "confirmed":
      return "order_confirmation";
    case "preparing":
      return "order_preparing";
    case "with_courier":
      return "order_with_courier";
    case "delivered":
      return "order_delivered";
    case "cancelled":
      return "order_cancelled";
    default:
      return "";
  }
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "PATCH") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!requireAdmin(request, response)) {
      return;
    }

    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    const orderId = cleanText(request.body?.orderId, 120);
    const status = cleanText(request.body?.status, 40);
    const note = cleanText(request.body?.note, 500);

    if (!orderId || !ORDER_STATUSES.includes(status)) {
      return sendJson(response, 400, { message: "بيانات تحديث الحالة غير صحيحة." });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return sendJson(response, 404, { message: "الطلب غير موجود." });
    }

    if (["confirmed", "paid", "preparing", "with_courier", "delivered"].includes(status) && !order.inventory_reserved) {
      await reserveInventoryForOrder(order);
    }

    if (["cancelled", "refunded"].includes(status) && order.inventory_reserved) {
      await releaseInventoryForOrder(order);
    }

    const extra = {};
    if (status === "paid") {
      extra.payment_status = "paid";
    } else if (status === "cancelled") {
      extra.payment_status = order.payment_method === "cash" ? "cancelled" : order.payment_status;
    }

    const updated = await updateOrderStatus(orderId, status, {
      note,
      actor: "admin",
      extra,
    });

    const emailType = emailTypeForStatus(status);
    if (emailType && updated?.customer?.email) {
      await sendTransactionalEmail(emailType, {
        to: updated.customer.email,
        customer: updated.customer,
        order: updated,
      }).catch(() => {});
    }

    return sendJson(response, 200, { order: updated });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Order update failed" });
  }
};
