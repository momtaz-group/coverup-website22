const { findOrderById, sendJson, supabaseConfigured, updateOrder } = require("./_store");

const PAYMOB_API_BASE = process.env.PAYMOB_API_BASE || "https://accept.paymob.com";

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const publicKey = process.env.PAYMOB_PUBLIC_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;

    if (!secretKey || !publicKey || !integrationId) {
      return sendJson(response, 501, {
        message:
          "الدفع الإلكتروني محتاج تفعيل بيانات Paymob على Vercel: PAYMOB_SECRET_KEY و PAYMOB_PUBLIC_KEY و PAYMOB_INTEGRATION_ID.",
      });
    }

    const orderId = String(request.body?.orderId || "").trim();
    if (!orderId) {
      return sendJson(response, 400, { message: "رقم الطلب مطلوب لتجهيز الدفع." });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return sendJson(response, 404, { message: "الطلب غير موجود." });
    }

    const amount = Math.round(Number(order.grand_total || order.total || 0) * 100);
    if (!amount) {
      return sendJson(response, 400, { message: "إجمالي الطلب غير صالح للدفع." });
    }

    const nameParts = String(order.customer?.name || "Cover Up Customer").trim().split(/\s+/);
    const firstName = nameParts.shift() || "Cover";
    const lastName = nameParts.join(" ") || "Up";
    const phone = String(order.customer?.phone || "01050310516").trim();
    const address = String(order.customer?.address || "Egypt").trim();
    const city = String(order.customer?.city || "Cairo").trim();

    const intentionPayload = {
      amount,
      currency: "EGP",
      payment_methods: [Number(integrationId)],
      merchant_order_id: order.id,
      items: (order.items || []).map((item) => ({
        name: item.name,
        amount: Math.round(Number(item.price) * 100),
        description: item.name,
        quantity: Number(item.quantity),
      })),
      billing_data: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: order.customer?.email || process.env.PAYMOB_FALLBACK_EMAIL || "hello@coverup.tech",
        apartment: "NA",
        floor: "NA",
        street: address,
        building: "NA",
        city,
        country: "EG",
        state: city,
      },
      extras: {
        source: "coverup.tech",
        order_id: order.id,
        customer_id: order.customer_id || "",
      },
      redirection_url: process.env.PAYMOB_REDIRECT_URL || "https://coverup.tech/cart.html?payment=return",
      notification_url: process.env.PAYMOB_WEBHOOK_URL || "https://coverup.tech/api/paymob-webhook",
    };

    const paymobResponse = await fetch(`${PAYMOB_API_BASE}/v1/intention/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(intentionPayload),
    });

    const data = await paymobResponse.json().catch(() => ({}));

    if (!paymobResponse.ok) {
      await updateOrder(order.id, {
        payment_status: "creation_failed",
        payment_payload: data || null,
      });

      return sendJson(response, paymobResponse.status, {
        message: data.detail || data.message || "Paymob رفض إنشاء عملية الدفع. راجع بيانات حساب التاجر.",
      });
    }

    const clientSecret = data.client_secret || data.clientSecret;
    const checkoutUrl =
      data.checkout_url ||
      data.checkoutUrl ||
      `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;

    await updateOrder(order.id, {
      payment_reference: order.id,
      payment_status: "initiated",
      payment_payload: data,
      status: "pending_payment",
      status_history: [
        ...(Array.isArray(order.status_history) ? order.status_history : []),
        {
          status: "pending_payment",
          at: new Date().toISOString(),
          note: "تم إنشاء رابط الدفع",
          actor: "system",
        },
      ],
    });

    return sendJson(response, 200, { checkoutUrl, clientSecret, orderId: order.id });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Payment creation failed" });
  }
};
