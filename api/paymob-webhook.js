const crypto = require("node:crypto");
const { sendTransactionalEmail } = require("./_email");
const {
  findOrderById,
  findOrderByPaymentReference,
  reserveInventoryForOrder,
  sendJson,
  supabaseConfigured,
  updateOrder,
  updateOrderStatus,
} = require("./_store");

function bodySignature(payload) {
  return crypto
    .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET || "")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function signatureValid(request, payload) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) {
    return true;
  }

  const incoming =
    request.headers["x-paymob-signature"] ||
    request.headers["x-paymob-hmac"] ||
    payload?.hmac ||
    "";

  if (!incoming) {
    return false;
  }

  return bodySignature(payload) === String(incoming).trim();
}

function extractOrderReference(payload) {
  return String(
    payload?.obj?.order?.merchant_order_id ||
      payload?.obj?.merchant_order_id ||
      payload?.merchant_order_id ||
      payload?.obj?.order?.id ||
      payload?.order?.merchant_order_id ||
      "",
  ).trim();
}

function extractTransactionId(payload) {
  return String(payload?.obj?.id || payload?.transaction_id || payload?.id || "").trim();
}

function extractAmount(payload) {
  const cents = Number(payload?.obj?.amount_cents || payload?.amount_cents || 0);
  return cents ? cents / 100 : 0;
}

function paymentSucceeded(payload) {
  if (typeof payload?.success === "boolean") {
    return payload.success;
  }

  if (typeof payload?.obj?.success === "boolean") {
    return payload.obj.success;
  }

  return false;
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    const payload = typeof request.body === "object" ? request.body : {};
    if (!signatureValid(request, payload)) {
      return sendJson(response, 401, { message: "Invalid webhook signature" });
    }

    const reference = extractOrderReference(payload);
    const transactionId = extractTransactionId(payload);
    const amount = extractAmount(payload);
    let order = reference ? await findOrderById(reference) : null;
    if (!order && reference) {
      order = await findOrderByPaymentReference(reference);
    }

    if (!order) {
      return sendJson(response, 404, { message: "Order not found" });
    }

    if (paymentSucceeded(payload)) {
      if (order.payment_status === "paid") {
        return sendJson(response, 200, { received: true, status: "already_paid" });
      }

      if (!order.inventory_reserved) {
        await reserveInventoryForOrder(order);
      }

      order = await updateOrderStatus(order.id, "paid", {
        note: "تم تأكيد الدفع من Paymob",
        actor: "paymob",
        extra: {
          payment_status: "paid",
          payment_transaction_id: transactionId,
          payment_payload: payload,
        },
      });

      await sendTransactionalEmail("payment_success", {
        to: order.customer?.email,
        customer: order.customer,
        order: {
          ...order,
          grand_total: amount || order.grand_total,
        },
      }).catch(() => {});

      return sendJson(response, 200, { received: true, status: "paid" });
    }

    order = await updateOrderStatus(order.id, "payment_failed", {
      note: "محاولة الدفع لم تكتمل",
      actor: "paymob",
      extra: {
        payment_status: "failed",
        payment_transaction_id: transactionId,
        payment_payload: payload,
      },
    });

    await sendTransactionalEmail("payment_failed", {
      to: order.customer?.email,
      customer: order.customer,
      order,
    }).catch(() => {});

    return sendJson(response, 200, { received: true, status: "payment_failed" });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Webhook error" });
  }
};
