const PAYMOB_API_BASE = process.env.PAYMOB_API_BASE || "https://accept.paymob.com";

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function validItem(item) {
  return (
    item &&
    typeof item.name === "string" &&
    Number.isFinite(Number(item.price)) &&
    Number.isFinite(Number(item.quantity)) &&
    Number(item.price) > 0 &&
    Number(item.quantity) > 0
  );
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, 405, { message: "Method not allowed" });
  }

  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const publicKey = process.env.PAYMOB_PUBLIC_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;

  if (!secretKey || !publicKey || !integrationId) {
    return sendJson(
      response,
      501,
      {
        message:
          "الدفع الإلكتروني محتاج تفعيل بيانات Paymob على Vercel: PAYMOB_SECRET_KEY و PAYMOB_PUBLIC_KEY و PAYMOB_INTEGRATION_ID.",
      },
    );
  }

  const payload = typeof request.body === "object" ? request.body : {};

  const items = Array.isArray(payload.items) ? payload.items.filter(validItem) : [];
  if (!items.length) {
    return sendJson(response, 400, { message: "السلة فاضية." });
  }

  const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const amount = Math.round(total * 100);
  const customer = payload.customer || {};
  const nameParts = String(customer.name || "Cover Up Customer").trim().split(/\s+/);
  const firstName = nameParts.shift() || "Cover";
  const lastName = nameParts.join(" ") || "Up";
  const phone = String(customer.phone || "01050310516").trim();
  const address = String(customer.address || "Egypt").trim();

  const intentionPayload = {
    amount,
    currency: "EGP",
    payment_methods: [Number(integrationId)],
    items: items.map((item) => ({
      name: item.name,
      amount: Math.round(Number(item.price) * 100),
      description: item.name,
      quantity: Number(item.quantity),
    })),
    billing_data: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      email: process.env.PAYMOB_FALLBACK_EMAIL || "hello@coverup.tech",
      apartment: "NA",
      floor: "NA",
      street: address,
      building: "NA",
      city: "Cairo",
      country: "EG",
      state: "Cairo",
    },
    extras: {
      source: "coverup.tech",
      customer_address: address,
    },
    redirection_url: process.env.PAYMOB_REDIRECT_URL || "https://coverup.tech/products.html",
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
    return sendJson(
      response,
      paymobResponse.status,
      {
        message: data.detail || data.message || "Paymob رفض إنشاء عملية الدفع. راجع بيانات حساب التاجر.",
      },
    );
  }

  const clientSecret = data.client_secret || data.clientSecret;
  const checkoutUrl =
    data.checkout_url ||
    data.checkoutUrl ||
    `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;

  return sendJson(response, 200, { checkoutUrl, clientSecret });
};
