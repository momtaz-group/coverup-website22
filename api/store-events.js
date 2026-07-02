const { STORE_KEYS, appendJson, getJson, kvConfigured, requireAdmin, sendJson } = require("./_store");

const allowedTypes = {
  order: STORE_KEYS.orders,
  review: STORE_KEYS.reviews,
  complaint: STORE_KEYS.complaints,
  chat: STORE_KEYS.chats,
};

function cleanText(value, limit = 800) {
  return String(value || "").trim().slice(0, limit);
}

function cleanPublicItem(type, body) {
  if (type === "order") {
    return {
      type,
      customer: {
        name: cleanText(body.customer?.name, 120),
        phone: cleanText(body.customer?.phone, 60),
        address: cleanText(body.customer?.address, 300),
      },
      items: Array.isArray(body.items) ? body.items.slice(0, 30) : [],
      total: Number(body.total) || 0,
      channel: cleanText(body.channel, 80),
    };
  }

  if (type === "review") {
    return {
      type,
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 60),
      rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
      message: cleanText(body.message, 1000),
    };
  }

  if (type === "complaint") {
    return {
      type,
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 60),
      orderRef: cleanText(body.orderRef, 120),
      message: cleanText(body.message, 1200),
    };
  }

  return {
    type,
    name: cleanText(body.name, 120),
    phone: cleanText(body.phone, 60),
    message: cleanText(body.message, 1000),
    reply: cleanText(body.reply, 1000),
    transcript: Array.isArray(body.transcript) ? body.transcript.slice(-12) : [],
  };
}

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    if (!requireAdmin(request, response)) {
      return;
    }

    const [orders, reviews, complaints, chats] = await Promise.all([
      getJson(STORE_KEYS.orders, []),
      getJson(STORE_KEYS.reviews, []),
      getJson(STORE_KEYS.complaints, []),
      getJson(STORE_KEYS.chats, []),
    ]);

    return sendJson(response, 200, {
      configured: orders.configured && reviews.configured && complaints.configured && chats.configured,
      orders: orders.data,
      reviews: reviews.data,
      complaints: complaints.data,
      chats: chats.data,
    });
  }

  if (request.method === "POST") {
    if (!kvConfigured()) {
      return sendJson(response, 501, { message: "KV storage is not configured." });
    }

    const type = cleanText(request.body?.type, 40);
    const key = allowedTypes[type];

    if (!key) {
      return sendJson(response, 400, { message: "Invalid type" });
    }

    const item = cleanPublicItem(type, request.body || {});
    const saved = await appendJson(key, item);
    return sendJson(response, 200, { saved });
  }

  return sendJson(response, 405, { message: "Method not allowed" });
};
